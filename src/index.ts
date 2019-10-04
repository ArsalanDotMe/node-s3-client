import AWS from 'aws-sdk'
import S3Events from './s3events'
import URL from 'url'

export const MAX_PUTOBJECT_SIZE = 5 * 1024 * 1024 * 1024
export const MAX_DELETE_COUNT = 1000
export const MAX_MULTIPART_COUNT = 10000
export const MIN_MULTIPART_SIZE = 5 * 1024 * 1024

export const createClient = function (options: ClientConfiguration) {
  return new Client(options)
}

async function sleep(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay))
}

export type ClientConfiguration = {
  s3Options?: AWS.S3.ClientConfiguration
  s3Client?: AWS.S3
  maxAsyncS3?: number
  s3RetryCount?: number
  s3RetryDelay?: number
  multipartUploadThreshold?: number
  multipartUploadSize?: number
  multipartDownloadThreshold?: number
  multipartDownloadSize?: number
}

export class Client {
  s3: AWS.S3
  s3RetryCount: number
  s3RetryDelay: number
  maxAsyncS3: number
  multipartUploadThreshold: number
  multipartUploadSize: number
  multipartDownloadThreshold: number
  multipartDownloadSize: number

  constructor(options: ClientConfiguration) {
    options = options || {}
    this.s3 = options.s3Client || new AWS.S3(options.s3Options)
    this.maxAsyncS3 = options.maxAsyncS3 || 20
    this.s3RetryCount = options.s3RetryCount || 3
    this.s3RetryDelay = options.s3RetryDelay || 1000
    this.multipartUploadThreshold = options.multipartUploadThreshold || (20 * 1024 * 1024)
    this.multipartUploadSize = options.multipartUploadSize || (15 * 1024 * 1024)
    this.multipartDownloadThreshold = options.multipartDownloadThreshold || (20 * 1024 * 1024)
    this.multipartDownloadSize = options.multipartDownloadSize || (15 * 1024 * 1024)

    if (this.multipartUploadThreshold < MIN_MULTIPART_SIZE) {
      throw new Error('Minimum multipartUploadThreshold is 5MB.')
    }
    if (this.multipartUploadThreshold > MAX_PUTOBJECT_SIZE) {
      throw new Error('Maximum multipartUploadThreshold is 5GB.')
    }
    if (this.multipartUploadSize < MIN_MULTIPART_SIZE) {
      throw new Error('Minimum multipartUploadSize is 5MB.')
    }
    if (this.multipartUploadSize > MAX_PUTOBJECT_SIZE) {
      throw new Error('Maximum multipartUploadSize is 5GB.')
    }
  }

  async deleteObjects(s3Params: AWS.S3.DeleteObjectsRequest) {
    const self = this
    const ee = new S3Events()

    const params: AWS.S3.DeleteObjectsRequest = {
      Bucket: s3Params.Bucket,
      Delete: extend({}, s3Params.Delete),
      MFA: s3Params.MFA
    }
    const slices: AWS.S3.ObjectIdentifier[][] = chunkArray(params.Delete.Objects, MAX_DELETE_COUNT)

    ee.progressAmount = 0
    ee.progressTotal = params.Delete.Objects.length

    Promise.all(slices.map(uploadSlice))
      .then(() => ee.emit('end'))
      .catch((err) => ee.emit('error', err))

    return ee

    async function uploadSlice(slice: AWS.S3.ObjectIdentifier[]) {
      const data = await doWithRetry(tryDeletingObjects, self.s3RetryCount, self.s3RetryDelay)
      ee.progressAmount += slice.length
      ee.emit('progress')
      ee.emit('data', data)

      function tryDeletingObjects() {
        params.Delete.Objects = slice
        return self.s3.deleteObjects(params).promise()
      }
    }
  }
}

async function doWithRetry(fn: () => Promise<any>, tryCount: number, delay: number) {
  let tryIndex = 0
  let result: any = null
  for (; tryIndex < tryCount; tryIndex++) {
    try {
      result = await fn()
      break
    } catch (err) {
      if (err.retryable === false) {
        throw err
      }
      if (tryIndex === (tryCount - 1)) {
        throw err
      }
      await sleep(delay)
    }
  }

  return result
}

function extend(target, source) {
  for (var propName in source) {
    target[propName] = source[propName]
  }
  return target
}

function chunkArray(array, maxLength) {
  var slices = [array]
  while (slices[slices.length - 1].length > maxLength) {
    slices.push(slices[slices.length - 1].splice(maxLength))
  }
  return slices
}

function encodeSpecialCharacters(filename) {
  // Note: these characters are valid in URIs, but S3 does not like them for
  // some reason.
  return encodeURI(filename).replace(/[!'()* ]/g, function (char) {
    return '%' + char.charCodeAt(0).toString(16)
  })
}

export function getPublicUrl(bucket, key, bucketLocation, endpoint) {
  var nonStandardBucketLocation = (bucketLocation && bucketLocation !== 'us-east-1')
  var hostnamePrefix = nonStandardBucketLocation ? ('s3-' + bucketLocation) : 's3'
  var parts = {
    protocol: 'https:',
    hostname: hostnamePrefix + '.' + (endpoint || 'amazonaws.com'),
    pathname: '/' + bucket + '/' + encodeSpecialCharacters(key)
  }
  return URL.format(parts)
}

export function getPublicUrlHttp(bucket, key, endpoint) {
  var parts = {
    protocol: 'http:',
    hostname: bucket + '.' + (endpoint || 's3.amazonaws.com'),
    pathname: '/' + encodeSpecialCharacters(key)
  }
  return URL.format(parts)
}
