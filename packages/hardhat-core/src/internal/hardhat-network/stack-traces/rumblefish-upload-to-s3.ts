/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
import type {
  AbortMultipartUploadCommandInput,
  CompleteMultipartUploadCommandInput,
  CompletedPart,
  CreateMultipartUploadCommandInput,
  PutObjectCommandInput,
  UploadPartCommandInput,
} from "@aws-sdk/client-s3";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

const uploadedParts: CompletedPart[] = [];

enum STATUS {
  PENDING,
  FINISHED,
  SENT,
  TOO_SMALL,
  ERROR,
}

interface ChunksContainter {
  status: STATUS;
  partNumber: number;
  lock: boolean;
  structLogs: string;
  uploadId: string;
  structLogIndex: number;
}

const uploadChunking: ChunksContainter = {
  uploadId: "",
  structLogs: "",
  status: STATUS.PENDING,
  partNumber: 1,
  lock: false,
  structLogIndex: 0,
};

const txHash: string = Object.getOwnPropertyDescriptor(global, "txHash")?.value;
const chainId: string = Object.getOwnPropertyDescriptor(
  global,
  "chainId"
)?.value;

export const getFileName = () => {
  return `trace/${chainId}/${txHash as string}.json`;
};

export const getFilePath = () => {
  const fileName = getFileName();
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${process.env.ANALYZER_DATA_BUCKET_NAME}/${fileName}`;
};

export const createMultiPartUpload = async () => {
  const fileName = getFileName();
  const params: CreateMultipartUploadCommandInput = {
    Key: fileName,
    Expires: new Date(Date.now() + 1000 * 60 * 10), // 10 minutes
    ContentType: "application/json",
    Bucket: process.env.ANALYZER_DATA_BUCKET_NAME,
  };
  const command = new CreateMultipartUploadCommand(params);
  let s3Response;

  try {
    s3Response = await s3Client.send(command);
  } catch (error) {
    console.log("CreateMultipartUploadCommand Error:", error);
    throw error;
  }

  const uploadId = s3Response?.UploadId;

  if (!uploadId) throw new Error("Failed to create multi part upload");

  return uploadId;
};

export const prepareTraceResultToUpload = (traceResult: any): string => {
  const traceResultAsString = JSON.stringify({
    returnValue: traceResult.returnValue,
    gas: traceResult.gas,
    failed: traceResult.failed,
  });
  return traceResultAsString.substring(1);
};

export const uploadPart = async (
  uploadId: string,
  partNumber: number,
  body: string | Buffer
) => {
  const fileName = getFileName();
  const params: UploadPartCommandInput = {
    UploadId: uploadId,
    PartNumber: partNumber,
    Key: fileName,
    Bucket: process.env.ANALYZER_DATA_BUCKET_NAME,
    Body: body,
  };
  const command = new UploadPartCommand(params);
  const response = await s3Client.send(command);
  return response.ETag;
};

export const uploadFile = async (body: string | Buffer) => {
  const fileName = getFileName();
  const params: PutObjectCommandInput = {
    Key: fileName,
    Bucket: process.env.ANALYZER_DATA_BUCKET_NAME,
    Body: body,
  };
  const command = new PutObjectCommand(params);
  const response = await s3Client.send(command);
  return response.ETag;
};

export const completeMultiPartUpload = async (
  uploadId: string,
  parts: CompletedPart[]
) => {
  const fileName = getFileName();
  const params: CompleteMultipartUploadCommandInput = {
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
    Key: fileName,
    Bucket: process.env.ANALYZER_DATA_BUCKET_NAME,
  };
  const command = new CompleteMultipartUploadCommand(params);
  await s3Client.send(command);
};

export const abortMultiPartUpload = async (uploadId: string) => {
  const fileName = getFileName();
  const params: AbortMultipartUploadCommandInput = {
    UploadId: uploadId,
    Key: fileName,
    Bucket: process.env.ANALYZER_DATA_BUCKET_NAME,
  };
  const command = new AbortMultipartUploadCommand(params);
  await s3Client.send(command);
};

export const uploadTrace = async (uploadId: string, trace: string) => {
  if (trace.length > 0) {
    const part: { partNumber: number; body: string } = {
      partNumber: uploadChunking.partNumber,
      body: trace,
    };
    console.log(`Uploading part ${part.partNumber}`);
    console.log(`Part size: ${part.body.length}`);

    const partETag = await uploadPart(uploadId, part.partNumber, part.body);
    if (!partETag) throw new Error(`Failed to upload part: ${part.partNumber}`);
    uploadedParts.push({ PartNumber: part.partNumber, ETag: partETag });
    uploadChunking.partNumber++;
  }
};
export const maxSize = 10 * 1024 * 1024; // 10 MB
export const minSize = 5 * 1024 * 1024; // 5 MB
export const shipIt = async (finalizer: any) => {
  console.log(`Preparing part ${uploadChunking.partNumber}`);
  let body =
    uploadChunking.partNumber > 1
      ? `,${uploadChunking.structLogs}`
      : `{"structLogs":[${uploadChunking.structLogs}`;

  if (finalizer) {
    const preparedTraceResult = prepareTraceResultToUpload(finalizer);
    body += `],${preparedTraceResult}`;
  }
  uploadChunking.structLogs = "";
  if (uploadChunking.partNumber > 1 || Buffer.from(body).length > minSize) {
    // Multipart upload
    try {
      console.log(`Trying to upload part ${uploadChunking.partNumber}`);
      if (uploadChunking.partNumber === 1) {
        // If its first part start upload process
        uploadChunking.uploadId = await createMultiPartUpload();
      }
      await uploadTrace(uploadChunking.uploadId, body);

      if (finalizer) {
        console.log(`Finalizing upload for ${txHash} x ${chainId}`);
        await completeMultiPartUpload(uploadChunking.uploadId, uploadedParts);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.log(error);
        // eslint-disable-next-line require-atomic-updates
        await abortMultiPartUpload(uploadChunking.uploadId);
        uploadChunking.status = STATUS.ERROR;
        throw new Error(error.message);
      }
    }
  } else {
    if (finalizer) {
      // Single upload
      await uploadFile(body);
    }
    // do nothing, wait for finalizer
  }
};
export const addToStructLogs = (newLog: string) => {
  uploadChunking.structLogs +=
    uploadChunking.structLogIndex > 0 ? newLog : `,${newLog}`;
};
export const uploadStructLogs = async (structLog: any) => {
  const currentSize: number = Buffer.from(uploadChunking.structLogs).length;

  const stringLog: string = JSON.stringify(structLog);
  if (uploadChunking.status === STATUS.PENDING) {
    if (currentSize + Buffer.from(stringLog).length > maxSize) {
      await shipIt(null);
      addToStructLogs(stringLog);
    } else {
      addToStructLogs(stringLog);
    }
  }
  uploadChunking.structLogIndex++;
};

export const finishUpload = async (data: any) => {
  uploadChunking.status = STATUS.FINISHED;
  await shipIt(data);
};
