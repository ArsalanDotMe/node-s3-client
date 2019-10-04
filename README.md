# High Level Amazon S3 Client

## Installation

`npm install s3-client --save`

## Features

 * Automatically retry a configurable number of times when S3 returns an error.
 * Includes logic to make multiple requests when there is a 1000 object limit.
 * Ability to set a limit on the maximum parallelization of S3 requests.
   Retries get pushed to the end of the parallelization queue.
 * Ability to sync a dir to and from S3.
 * Progress reporting.
 * Supports files of any size (up to S3's maximum 5 TB object size limit).
 * Uploads large files quickly using parallel multipart uploads.
 * Uses heuristics to compute multipart ETags client-side to avoid uploading
   or downloading files unnecessarily.
 * Automatically provide Content-Type for uploads based on file extension.
 * Support third-party S3-compatible platform services like Ceph

See also the companion CLI tool which is meant to be a drop-in replacement for
s3cmd: [s3-cli](https://github.com/matrus2/node-s3-cli).

## Synopsis

### Create a client

```js
var s3 = require('s3-client');

var client = s3.createClient({
  maxAsyncS3: 20,     // this is the default
  s3RetryCount: 3,    // this is the default
  s3RetryDelay: 1000, // this is the default
  multipartUploadThreshold: 20971520, // this is the default (20 MB)
  multipartUploadSize: 15728640, // this is the default (15 MB)
  s3Options: {
    accessKeyId: "your s3 key",
    secretAccessKey: "your s3 secret",
    region: "your region",
    // endpoint: 's3.yourdomain.com',
    // sslEnabled: false
    // any other options are passed to new AWS.S3()
    // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
  },
});
```

### Create a client from existing AWS.S3 object

```js
var s3 = require('s3-client');
var awsS3Client = new AWS.S3(s3Options);
var options = {
  s3Client: awsS3Client,
  // more options available. See API docs below.
};
var client = s3.createClient(options);
```

## API Documentation

### s3.createClient(options)

Creates an S3 client.

`options`:

 * `s3Client` - optional, an instance of `AWS.S3`. Leave blank if you provide `s3Options`.
 * `s3Options` - optional. leave blank if you provide `s3Client`.
   - See AWS SDK documentation for available options which are passed to `new AWS.S3()`:
     http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
 * `maxAsyncS3` - maximum number of simultaneous requests this client will
   ever have open to S3. defaults to `20`.
 * `s3RetryCount` - how many times to try an S3 operation before giving up.
   Default 3.
 * `s3RetryDelay` - how many milliseconds to wait before retrying an S3
   operation. Default 1000.
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


### client.deleteObjects(s3Params)

See http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObjects-property

`s3Params` are the same.

The difference between using AWS SDK `deleteObjects` and this one:

 * Retry based on the client's retry settings.
 * Make multiple requests if the number of objects you want to delete is
   greater than 1000.

Returns an `EventEmitter` with these properties:

 * `progressAmount`
 * `progressTotal`

And these events:

 * `'error' (err)`
 * `'end'` - emitted when all objects are deleted.
 * `'progress'` - emitted when the `progressAmount` or `progressTotal` properties change.
 * `'data' (data)` - emitted when a request completes. There may be more.

## Testing

`S3_KEY=<valid_s3_key> S3_SECRET=<valid_s3_secret> S3_BUCKET=<valid_s3_bucket> npm test`

Tests upload and download large amounts of data to and from S3. The test
timeout is set to 40 seconds because Internet connectivity waries wildly.
