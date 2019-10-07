import AWS from 'aws-sdk'
import URL from 'url'
import { EventEmitter } from 'events'

export const MAX_PUTOBJECT_SIZE = 5 * 1024 * 1024 * 1024
export const MAX_DELETE_COUNT = 1000
export const MAX_MULTIPART_COUNT = 10000
export const MIN_MULTIPART_SIZE = 5 * 1024 * 1024

async function sleep (delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay))
}

export type DeleteDirRequest = {
  Bucket: string
  Prefix: string
  MFA?: string
}

export type ListObjectsRequest = {
  maxObjects?: number,
  s3Params: AWS.S3.ListObjectsV2Request
}

export type ClientConfiguration = {
  s3Client: AWS.S3
  maxAsyncS3?: number
  s3RetryCount?: number
  s3RetryDelay?: number
  multipartUploadThreshold?: number
  multipartUploadSize?: number
  multipartDownloadThreshold?: number
  multipartDownloadSize?: number
}

export const createClient = function (options: ClientConfiguration) {
  return new Client(options)
}

class Client {
  s3: AWS.S3
  s3RetryCount: number
  s3RetryDelay: number
  maxAsyncS3: number
  multipartUploadThreshold: number
  multipartUploadSize: number
  multipartDownloadThreshold: number
  multipartDownloadSize: number

  constructor (options: ClientConfiguration) {
    options = options || {}
    this.s3 = options.s3Client
    if (!options.s3Client) {
      throw new Error('You need to pass in your own initialized s3Client')
    }
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

  async deleteObjects (s3Params: AWS.S3.DeleteObjectsRequest, ee?: EventEmitter) {
    const params: AWS.S3.DeleteObjectsRequest = {
      Bucket: s3Params.Bucket,
      Delete: { ...s3Params.Delete },
      MFA: s3Params.MFA
    }

    const slices: AWS.S3.ObjectIdentifier[][] = chunkArray(params.Delete.Objects, MAX_DELETE_COUNT)

    let progressTotal = 0
    return Promise.all(slices.map(async (slice: AWS.S3.ObjectIdentifier[]) => {
      params.Delete.Objects = slice
      const data = await this.s3.deleteObjects(params).promise()
      if (ee && data.Deleted) {
        const progressAmount = data.Deleted.length
        progressTotal += progressAmount
        ee.emit('progress', { progressAmount, progressTotal })
      }
      ee && ee.emit('data', data)
      return data
    }))
  }

  async deleteDir (s3Params: DeleteDirRequest) {
    const bucket = s3Params.Bucket
    let listObjectsParams = {
      s3Params: {
        Bucket: bucket,
        Prefix: s3Params.Prefix
      }
    }
    const ee = new EventEmitter()
    const listObjectsPromise = this.listObjects(listObjectsParams, ee)
    let deleteObjectPromises: Promise<AWS.S3.DeleteObjectsOutput>[] = []
    ee.on('data', (objects) => {
      const deleteParams: AWS.S3.DeleteObjectsRequest = {
        Bucket: s3Params.Bucket,
        Delete: {
          Objects: objects.map(keyOnly),
          Quiet: true
        },
        MFA: s3Params.MFA
      }
      deleteObjectPromises.push(this.s3.deleteObjects(deleteParams).promise())
    })
    await listObjectsPromise
    return Promise.all(deleteObjectPromises)
  }

  async listObjects (params: ListObjectsRequest, ee?: EventEmitter) {
    let s3Details = { ...params.s3Params }

    const MAX_KEYS = 1000
    const maxObjectsToList = params.maxObjects || 10 * 1000
    let s3ObjectsList: Array<AWS.S3.Object> = []
    let isPending: boolean = true
    let continuationToken: string | undefined = s3Details.ContinuationToken

    while (isPending && s3ObjectsList.length < maxObjectsToList) {
      const listData = await this.s3.listObjectsV2({
        ...s3Details,
        ContinuationToken: continuationToken,
        MaxKeys: s3Details.MaxKeys || MAX_KEYS
      }).promise()
      if (!listData.Contents) {
        throw new Error('List Contents should always be defined')
      }

      isPending = !!listData.IsTruncated
      continuationToken = listData.NextContinuationToken

      const listObjects = listData.Contents
      if (ee) { ee.emit('data', listObjects) }
      s3ObjectsList = [...s3ObjectsList, ...listObjects]
    }
    return s3ObjectsList
  }
}

function extend (target, source) {
  for (let propName in source) {
    target[propName] = source[propName]
  }
  return target
}

function chunkArray (array, maxLength) {
  let slices = [array]
  while (slices[slices.length - 1].length > maxLength) {
    slices.push(slices[slices.length - 1].splice(maxLength))
  }
  return slices
}

function encodeSpecialCharacters (filename) {
  // Note: these characters are valid in URIs, but S3 does not like them for
  // some reason.
  return encodeURI(filename).replace(/[!'()* ]/g, function (char) {
    return '%' + char.charCodeAt(0).toString(16)
  })
}

export function getPublicUrl (bucket: string, key: string, bucketLocation?: string, endpoint?: string) {
  let nonStandardBucketLocation = (bucketLocation && bucketLocation !== 'us-east-1')
  let hostnamePrefix = nonStandardBucketLocation ? ('s3-' + bucketLocation) : 's3'
  let parts = {
    protocol: 'https:',
    hostname: hostnamePrefix + '.' + (endpoint || 'amazonaws.com'),
    pathname: '/' + bucket + '/' + encodeSpecialCharacters(key)
  }
  return URL.format(parts)
}

export function getPublicUrlHttp (bucket: string, key: string, endpoint?: string) {
  let parts = {
    protocol: 'http:',
    hostname: bucket + '.' + (endpoint || 's3.amazonaws.com'),
    pathname: '/' + encodeSpecialCharacters(key)
  }
  return URL.format(parts)
}

function keyOnly (item: AWS.S3.Object) {
  return {
    Key: item.Key as string,
    VersionId: (item as any).VersionId
  }
}
