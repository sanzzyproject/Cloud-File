import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from "@aws-sdk/client-cognito-identity";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import { HttpRequest } from "@smithy/protocol-http";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";

const CONFIG = {
  region: "us-east-1",
  identityPoolId: "us-east-1:3b2f9a16-a4b2-4045-9255-453415bad9b6",
  userPoolId: "us-east-1_x97ADZ3w6",
  userPoolClientId: "244uckma1os7oj7id29uk719ap",
  appsyncUrl: "https://l4xs67tsanblbn3gu4r33i76xe.appsync-api.us-east-1.amazonaws.com/graphql",
  s3Bucket: "amplify-mindbytebackend-j-mindbyteappbucket40d036a-nhen0zx97aq3",
  apiGatewayUrl: "https://sp0geked98.execute-api.us-east-1.amazonaws.com/",
  chatWorkersUrl: "https://rough-mouse-ae3c.musharaf-h-abid.workers.dev/chat",
  maxSpacePerAccount: 1099511627776, // 1 TB
};

let globalCreds: any = null;
let globalIdentityId: string | null | undefined = null;
const cognitoClient = new CognitoIdentityClient({ region: CONFIG.region });

export async function refreshAwsCredentials() {
  const getIdResp = await cognitoClient.send(
    new GetIdCommand({ IdentityPoolId: CONFIG.identityPoolId })
  );
  globalIdentityId = getIdResp.IdentityId;

  const credsResp = await cognitoClient.send(
    new GetCredentialsForIdentityCommand({
      IdentityId: globalIdentityId!,
    })
  );
  const c = credsResp.Credentials;
  if (!c) throw new Error("Could not fetch credentials");
  
  globalCreds = {
    accessKeyId: c.AccessKeyId,
    secretAccessKey: c.SecretKey,
    sessionToken: c.SessionToken,
    expiration: c.Expiration,
  };
  return globalCreds;
}

async function getCreds() {
  if (!globalCreds || new Date(globalCreds.expiration).getTime() < Date.now() + 60000) {
    await refreshAwsCredentials();
  }
  return globalCreds;
}

async function signGraphqlRequest(body: any) {
  const creds = await getCreds();
  const payload = JSON.stringify(body);
  const url = new URL(CONFIG.appsyncUrl);

  const request = new HttpRequest({
    method: "POST",
    hostname: url.hostname,
    path: url.pathname,
    protocol: url.protocol,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      host: url.hostname,
    },
    body: payload,
  });

  const signer = new SignatureV4({
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
    region: CONFIG.region,
    service: "appsync",
    sha256: Sha256,
  });

  const signed = await signer.sign(request);
  return signed.headers;
}

export async function graphql(query: string, variables: any = null) {
  const body: any = { query };
  if (variables) body.variables = variables;

  const headers = await signGraphqlRequest(body);
  const payload = JSON.stringify(body);

  const resp = await fetch(CONFIG.appsyncUrl, {
    method: "POST",
    headers,
    body: payload,
  });

  const data = await resp.json();
  if (data.errors) {
    const shouldRetry = data.errors.some(
      (e: any) =>
        e.errorType === "UnauthorizedException" ||
        e.errorType === "InvalidSessionTokenException"
    );
    if (shouldRetry) {
      await refreshAwsCredentials();
      return graphql(query, variables);
    }
    throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
  }
  return data;
}

export function generateBackupId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 22; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result + "2";
}

export async function getOrCreateBackup(backupId?: string, totalSpaceBytes = CONFIG.maxSpacePerAccount) {
  if (!backupId) {
    backupId = generateBackupId();
  }

  const query = `query GetBackupAppTable($id: ID!) {
    getBackupAppTable(id: $id) {
      createdAt id name spaceUsed totalSpace updatedAt
    }
  }`;
  const data = await graphql(query, { id: backupId });
  const result = data.data?.getBackupAppTable;
  
  if (result) {
    return result;
  }

  const mutation = `mutation CreateBackupAppTable($input: CreateBackupAppTableInput!) {
    createBackupAppTable(input: $input) {
      createdAt id name spaceUsed totalSpace updatedAt
    }
  }`;
  const inp = {
    id: backupId,
    name: backupId,
    totalSpace: String(totalSpaceBytes),
    spaceUsed: "0",
  };
  const createData = await graphql(mutation, { input: inp });
  return createData.data.createBackupAppTable;
}

async function getS3Client() {
  const creds = await getCreds();
  return new S3Client({
    region: CONFIG.region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
  });
}

export async function getStorageInfo(backupId: string) {
  const query = `query GetBackupAppTable($id: ID!) {
    getBackupAppTable(id: $id) {
      spaceUsed totalSpace
    }
  }`;
  const data = await graphql(query, { id: backupId });
  const result = data.data?.getBackupAppTable;
  
  if (!result) throw new Error("Backup not found");
  
  const spaceUsed = parseInt(result.spaceUsed, 10);
  const totalSpace = parseInt(result.totalSpace, 10);
  return {
    spaceUsed,
    totalSpace,
    usedPercent: parseFloat(((spaceUsed / totalSpace) * 100).toFixed(2)),
    remaining: totalSpace - spaceUsed,
  };
}

export async function updateSpaceUsed(backupId: string, additionalBytes: number) {
  // First get current space used
  const info = await getStorageInfo(backupId);
  const newSpaceUsed = info.spaceUsed + additionalBytes;

  const mutation = `mutation UpdateBackupAppTable($input: UpdateBackupAppTableInput!) {
    updateBackupAppTable(input: $input) {
      createdAt id name spaceUsed totalSpace updatedAt
    }
  }`;
  const inp = {
    id: backupId,
    spaceUsed: String(newSpaceUsed),
  };
  await graphql(mutation, { input: inp });
}

export async function uploadBytes(backupId: string, data: Uint8Array, remoteKey: string, contentType: string) {
  const s3Key = `public/${backupId}/${remoteKey}`;
  const s3 = await getS3Client();

  const command = new PutObjectCommand({
    Bucket: CONFIG.s3Bucket,
    Key: s3Key,
    Body: data,
    ContentType: contentType,
  });

  await s3.send(command);
  await updateSpaceUsed(backupId, data.length);
  return s3Key;
}

export async function getFileUrl(backupId: string, remoteKey: string, expiresIn = 3600) {
  const s3Key = `public/${backupId}/${remoteKey}`;
  const s3 = await getS3Client();

  const command = new GetObjectCommand({
    Bucket: CONFIG.s3Bucket,
    Key: s3Key,
  });

  return getSignedUrl(s3, command, { expiresIn });
}

export async function listFiles(backupId: string, prefix = "") {
  const s3Prefix = `public/${backupId}/${prefix}`;
  const s3 = await getS3Client();

  const command = new ListObjectsV2Command({
    Bucket: CONFIG.s3Bucket,
    Prefix: s3Prefix,
  });

  const resp = await s3.send(command);
  const files = [];
  for (const obj of resp.Contents || []) {
    if (!obj.Key) continue;
    const relativeKey = obj.Key.replace(`public/${backupId}/`, "");
    files.push({
      key: obj.Key,
      relativeKey: relativeKey,
      size: obj.Size,
      lastModified: obj.LastModified,
      url: await getFileUrl(backupId, relativeKey),
    });
  }
  return files;
}

export async function deleteFile(backupId: string, remoteKey: string) {
  const s3Key = `public/${backupId}/${remoteKey}`;
  const s3 = await getS3Client();

  // Optionally we should deduct space used, but let's keep it simple or implement it 
  // if we can get the object size first. For now, just delete it.
  const command = new DeleteObjectCommand({
    Bucket: CONFIG.s3Bucket,
    Key: s3Key,
  });

  await s3.send(command);
}

export async function chatAI(message: string) {
  const payload = { message };
  const resp = await fetch(CONFIG.chatWorkersUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (resp.ok) {
    const data = await resp.json();
    return data.answer || "";
  }
  throw new Error(`Chat error: ${resp.status} ${await resp.text()}`);
}

export async function deleteAccount(backupId: string) {
  const payload = { id: backupId };
  const resp = await fetch(`${CONFIG.apiGatewayUrl}deleteaccount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return resp.text();
}
