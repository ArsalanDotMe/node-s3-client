/// <reference types="node" />
import AWS from 'aws-sdk';
import { EventEmitter } from 'events';
export declare const MAX_PUTOBJECT_SIZE: number;
export declare const MAX_DELETE_COUNT = 1000;
export declare const MAX_MULTIPART_COUNT = 10000;
export declare const MIN_MULTIPART_SIZE: number;
export declare type DeleteDirRequest = {
    Bucket: string;
    Prefix: string;
    MFA?: string;
};
export declare type ListObjectsRequest = {
    maxObjects?: number;
    s3Params: AWS.S3.ListObjectsV2Request;
};
export declare type ClientConfiguration = {
    s3Client: AWS.S3;
    maxAsyncS3?: number;
    s3RetryCount?: number;
    s3RetryDelay?: number;
    multipartUploadThreshold?: number;
    multipartUploadSize?: number;
    multipartDownloadThreshold?: number;
    multipartDownloadSize?: number;
};
export declare const createClient: (options: ClientConfiguration) => Client;
declare class Client {
    s3: AWS.S3;
    s3RetryCount: number;
    s3RetryDelay: number;
    maxAsyncS3: number;
    multipartUploadThreshold: number;
    multipartUploadSize: number;
    multipartDownloadThreshold: number;
    multipartDownloadSize: number;
    constructor(options: ClientConfiguration);
    deleteObjects(s3Params: AWS.S3.DeleteObjectsRequest, ee?: EventEmitter): Promise<import("aws-sdk/lib/request").PromiseResult<AWS.S3.DeleteObjectsOutput, AWS.AWSError>[]>;
    deleteDir(s3Params: DeleteDirRequest): Promise<AWS.S3.DeleteObjectsOutput[]>;
    listObjects(params: ListObjectsRequest, ee?: EventEmitter): Promise<AWS.S3.Object[]>;
}
export declare function getPublicUrl(bucket: string, key: string, bucketLocation?: string, endpoint?: string): string;
export declare function getPublicUrlHttp(bucket: string, key: string, endpoint?: string): string;
export {};
//# sourceMappingURL=index.d.ts.map