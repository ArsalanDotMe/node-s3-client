# High Level Amazon S3 Client

## Installation

`npm install modern-s3`

Inspired by the now abandoned [s3](https://www.npmjs.com/package/s3)

## Features

 * Relies on the modern versions of AWS client SDK for retries. Does not implement its own retry logic
 * Includes logic to make multiple requests when there is a 1000 object limit.
 * Ability to set a limit on the maximum parallelization of S3 requests.
 * Ability to sync a dir to and from S3.
 * Promise based API with additional reporting if passed an event emitter
 * Supports files of any size (up to S3's maximum 5 TB object size limit).
 * Relies on the AWS SDK's own intelligent upload method to do multipart uploads.
 * Automatically provide Content-Type for uploads based on file extension.

## Synopsis

### Create a client

```js
import AWS from 'aws-sdk'
import * as s3 from 'modern-s3'

const awsClient = new AWS.S3({
  accessKeyId: "your s3 key",
  secretAccessKey: "your s3 secret",
  region: "your region",
  // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
})

var client = s3.createClient({
  maxAsyncS3: 20,     // this is the default
  multipartUploadThreshold: 20971520, // this is the default (20 MB)
  multipartUploadSize: 15728640, // this is the default (15 MB)
  s3Client: awsClient
})
```

## API Documentation

### s3.createClient(options)

Creates an S3 client.

`options`:

 * `s3Client` - an instance of `AWS.S3`.
 * `maxAsyncS3` - maximum number of simultaneous requests this client will
   ever have open to S3. defaults to `20`.
 * `multipartUploadThreshold` - if a file is this many bytes or greater, it
   will be uploaded via a multipart request. Default is 20MB. Minimum is 5MB.
   Maximum is 5GB.
 * `multipartUploadSize` - when uploading via multipart, this is the part size.
   The minimum size is 5MB. The maximum size is 5GB. Default is 15MB. Note that
   S3 has a maximum of 10000 parts for a multipart upload, so if this value is
   too small, it will be ignored in favor of the minimum necessary value
   required to upload the file.

### s3.getPublicUrl(bucket, key, [bucketLocation])

 * `bucket` S3 bucket
 * `key` S3 key
 * `bucketLocation` string, one of these:
   - "" (default) - US Standard
   - "eu-west-1"
   - "us-west-1"
   - "us-west-2"
   - "ap-southeast-1"
   - "ap-southeast-2"
   - "ap-northeast-1"
   - "sa-east-1"

You can find out your bucket location programatically by using this API:
http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getBucketLocation-property

returns a string which looks like this:

`https://s3.amazonaws.com/bucket/key`

or maybe this if you are not in US Standard:

`https://s3-eu-west-1.amazonaws.com/bucket/key`

### s3.getPublicUrlHttp(bucket, key)

 * `bucket` S3 Bucket
 * `key` S3 Key

Works for any region, and returns a string which looks like this:

`http://bucket.s3.amazonaws.com/key`


### client.deleteObjects(s3Params, ee?: EventEmitter)

See http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObjects-property

`s3Params` are the same.

The difference between using AWS SDK `deleteObjects` and this one:

 * Make multiple requests if the number of objects you want to delete is
   greater than 1000.

If passed an `EventEmitter` it emits the following events:

 * `'progress'` - emitted with object `{ progressAmount: number, progressTotal: number }`.
 * `'data' (data)` - emitted when a request completes.

Returns list of responses from AWS requests

### client.deleteDir(params)

Deletes specified directory and all its children in an S3 bucket. If objects within a directory
are more than 1000, it deletes them in multiple requests.

`params` is an object with following properties:
 * Bucket (required)
 * Prefix (required)
 * MFA (optional)

Returns list of responses from AWS Delete Object requests.

### client.listObjects(params, ee?: EventEmitter)

Lists objects recursively in the specified directory or path in S3. If there are more than 1000 requests, it
lists objects in multiple requests.

`params` is an object with following properties:
 * maxObjects: maximum number of objects to list (but might still return more than this number). Default is 10,0000
 * s3Params: See https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property

If passed an EventEmitter, it emits the following events on it:

 * `'data'` - emitted when a request completes. Called with array of returned S3 objects (`AWS.S3.Object[]`)

Returns list of S3 Objects (`AWS.S3.Object[]`)

## Testing

`S3_KEY=<valid_s3_key> S3_SECRET=<valid_s3_secret> S3_BUCKET=<valid_s3_bucket> npm test`

Tests upload and download large amounts of data to and from S3. The test
timeout is set to 40 seconds because Internet connectivity waries wildly.
