import AWS from 'aws-sdk'
import * as s3 from './index'
import { EventEmitter } from 'events'
let path = require('path')
let ncp = require('ncp')
import assert from 'assert'
import fs from 'fs'
import mkdirp from 'mkdirp'
let crypto = require('crypto')
import rimraf from 'rimraf'
let StreamSink = require('streamsink')
let tempDir = path.join(__dirname, 'tmp')
let tempManyFilesDir = path.join(__dirname, 'tmp', 'many-files-dir')
let localFile = path.join(tempDir, 'random.png')
let remoteRoot = 'node-s3-test/'
let remoteFile = remoteRoot + 'file.png'
let remoteFile2 = remoteRoot + 'file2.png'
let remoteFile3 = remoteRoot + 'file3.png'
let remoteDir = remoteRoot + 'dir1'
let remoteManyFilesDir = remoteRoot + 'many-files-dir'
let file1Md5 = 'b1946ac92492d2347c6235b4d2611184'

jest.setTimeout(20 * 1000)

if (!process.env.S3_BUCKET || !process.env.S3_KEY || !process.env.S3_SECRET) {
  console.log('S3_BUCKET, S3_KEY, and S3_SECRET env vars needed to run tests')
  process.exit(1)
}

let s3Bucket = process.env.S3_BUCKET

function createClient () {
  const s3aws = new AWS.S3({
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
    endpoint: process.env.S3_ENDPOINT
  })
  return s3.createClient({
    multipartUploadThreshold: 15 * 1024 * 1024,
    multipartUploadSize: 5 * 1024 * 1024,
    s3Client: s3aws
  })
}

async function createBigFile (file, size) {
  return new Promise((resolve, reject) => {
    mkdirp(path.dirname(file), function (err) {
      if (err) return reject(err)
      let md5sum = crypto.createHash('md5')
      let out = fs.createWriteStream(file)
      out.on('error', function (err) {
        reject(err)
      })
      out.on('close', function () {
        resolve(md5sum.digest('hex'))
      })
      let str = 'abcdefghijklmnopqrstuvwxyz'
      let buf = ''
      for (let i = 0; i < size; ++i) {
        buf += str[i % str.length]
      }
      out.write(buf)
      md5sum.update(buf)
      out.end()
    })
  })
}

// function createFolderOfFiles (dir, numFiles, sizeOfFiles, cb) {
//   for (let i = 0, j = numFiles; i < numFiles; i++) {
//     createBigFile(path.join(dir, 'file' + i), sizeOfFiles, function () {
//       j--
//       if (j === 0) {
//         cb()
//       }
//     })
//   }
// }

describe('s3', function () {
  let hexdigest

  beforeAll(async () => {
    let client = createClient()
    let s3Params = {
      Prefix: remoteRoot,
      Bucket: s3Bucket
    }
    await client.deleteDir(s3Params)
  })

  afterAll(function (done) {
    rimraf(tempDir, done)
  })

  afterAll(function () {
    fs.writeFileSync(path.join(__dirname, 'dir3', 'index.html'), '')
  })

  test('get public URL', () => {
    let httpsUrl = s3.getPublicUrl('mybucket', 'path/to/key')
    expect(httpsUrl).toStrictEqual('https://s3.amazonaws.com/mybucket/path/to/key')
    let httpUrl = s3.getPublicUrlHttp('mybucket', 'path/to/key')
    assert.strictEqual(httpUrl, 'http://mybucket.s3.amazonaws.com/path/to/key')
    // treat slashes literally
    httpsUrl = s3.getPublicUrl('marina-restaurant.at', 'uploads/about_restaurant_10.jpg', 'eu-west-1')
    assert.strictEqual(httpsUrl,
      'https://s3-eu-west-1.amazonaws.com/marina-restaurant.at/uploads/about_restaurant_10.jpg')
  })

  test('uploads', async () => {
    await createBigFile(localFile, 120 * 1024)
    let client = createClient()
    const readStream = fs.createReadStream(localFile)
    let params = {
      Key: remoteFile,
      Bucket: s3Bucket,
      Body: readStream
    }
    await client.s3.upload(params).promise()
  })

  // it('downloads', function (done) {
  //   doDownloadFileTest(done)
  // })

  // it('downloadBuffer', function (done) {
  //   let client = createClient()
  //   let downloader = client.downloadBuffer({ Key: remoteFile, Bucket: s3Bucket })
  //   downloader.on('error', done)
  //   let progress = 0
  //   let progressEventCount = 0
  //   let gotHttpHeaders = false
  //   downloader.on('progress', function () {
  //     let amountDone = downloader.progressAmount
  //     let amountTotal = downloader.progressTotal
  //     let newProgress = amountDone / amountTotal
  //     progressEventCount += 1
  //     assert(newProgress >= progress, 'old progress: ' + progress + ', new progress: ' + newProgress)
  //     progress = newProgress
  //   })
  //   downloader.on('httpHeaders', function (statusCode, headers, resp) {
  //     let contentType = headers['content-type']
  //     assert.strictEqual(contentType, 'image/png')
  //     gotHttpHeaders = true
  //   })
  //   downloader.on('end', function (buffer) {
  //     assert.strictEqual(progress, 1)
  //     assert(progressEventCount >= 3, 'expected at least 3 progress events. got ' + progressEventCount)
  //     let md5sum = crypto.createHash('md5')
  //     md5sum.update(buffer)
  //     assert.strictEqual(md5sum.digest('hex'), hexdigest)
  //     assert.ok(gotHttpHeaders)
  //     done()
  //   })
  // })

  // it('downloadStream', function (done) {
  //   let client = createClient()
  //   let downloadStream = client.downloadStream({ Key: remoteFile, Bucket: s3Bucket })
  //   downloadStream.on('error', done)
  //   let gotHttpHeaders = false
  //   downloadStream.on('httpHeaders', function (statusCode, headers, resp) {
  //     let contentType = headers['content-type']
  //     assert.strictEqual(contentType, 'image/png')
  //     gotHttpHeaders = true
  //   })
  //   let sink = new StreamSink()
  //   downloadStream.pipe(sink)
  //   sink.on('finish', function () {
  //     let md5sum = crypto.createHash('md5')
  //     md5sum.update(sink.toBuffer())
  //     assert.strictEqual(md5sum.digest('hex'), hexdigest)
  //     assert.ok(gotHttpHeaders)
  //     done()
  //   })
  // })

  test('lists objects', async () => {
    let params = {
      s3Params: {
        Bucket: s3Bucket,
        Prefix: remoteRoot
      }
    }
    let client = createClient()
    const ee = new EventEmitter()
    let listObjectPromise = client.listObjects(params, ee)
    let found = false
    ee.on('data', (objects) => {
      expect(objects.length).toBe(1)
      found = true
    })
    const objects = await listObjectPromise
    expect(objects.length).toBe(1)
    expect(found).toBe(true)
  })

  // it('copies an object', function (done) {
  //   let s3Params = {
  //     Bucket: s3Bucket,
  //     CopySource: s3Bucket + '/' + remoteFile,
  //     Key: remoteFile2
  //   }
  //   let client = createClient()
  //   let copier = client.copyObject(s3Params)
  //   copier.on('end', function (data) {
  //     done()
  //   })
  // })

  // it('moves an object', function (done) {
  //   let s3Params = {
  //     Bucket: s3Bucket,
  //     CopySource: s3Bucket + '/' + remoteFile2,
  //     Key: remoteFile3
  //   }
  //   let client = createClient()
  //   let copier = client.moveObject(s3Params)
  //   copier.on('end', function (data) {
  //     done()
  //   })
  // })

  // it('deletes an object', function (done) {
  //   let client = createClient()
  //   let params = {
  //     Bucket: s3Bucket,
  //     Delete: {
  //       Objects: [
  //         {
  //           Key: remoteFile
  //         },
  //         {
  //           Key: remoteFile3
  //         }
  //       ]
  //     }
  //   }
  //   let deleter = client.deleteObjects(params)
  //   deleter.on('end', function () {
  //     done()
  //   })
  // })

  // it('uploads a folder', function (done) {
  //   let client = createClient()
  //   let params = {
  //     localDir: path.join(__dirname, 'dir1'),
  //     s3Params: {
  //       Prefix: remoteDir,
  //       Bucket: s3Bucket
  //     }
  //   }
  //   let uploader = client.uploadDir(params)
  //   uploader.on('end', function () {
  //     done()
  //   })
  // })

  // it('downloads a folder', function (done) {
  //   let client = createClient()
  //   let localDir = path.join(tempDir, 'dir-copy')
  //   let params = {
  //     localDir: localDir,
  //     s3Params: {
  //       Prefix: remoteDir,
  //       Bucket: s3Bucket
  //     }
  //   }
  //   let downloader = client.downloadDir(params)
  //   downloader.on('end', function () {
  //     assertFilesMd5([
  //       {
  //         path: path.join(localDir, 'file1'),
  //         md5: file1Md5
  //       },
  //       {
  //         path: path.join(localDir, 'file2'),
  //         md5: '6f0f1993fceae490cedfb1dee04985af'
  //       },
  //       {
  //         path: path.join(localDir, 'inner1/a'),
  //         md5: 'ebcb2061cab1d5c35241a79d27dce3af'
  //       },
  //       {
  //         path: path.join(localDir, 'inner2/b'),
  //         md5: 'c96b1cbe66f69b234cf361d8c1e5bbb9'
  //       }
  //     ], done)
  //   })
  // })

  // it('uploadDir with deleteRemoved', function (done) {
  //   let client = createClient()
  //   let params = {
  //     localDir: path.join(__dirname, 'dir2'),
  //     deleteRemoved: true,
  //     s3Params: {
  //       Prefix: remoteDir,
  //       Bucket: s3Bucket
  //     }
  //   }
  //   let uploader = client.uploadDir(params)
  //   uploader.on('end', function () {
  //     done()
  //   })
  // })

//   it('lists objects', function (done) {
//     let params = {
//       recursive: true,
//       s3Params: {
//         Bucket: s3Bucket,
//         Prefix: remoteDir
//       }
//     }
//     let client = createClient()
//     let finder = client.listObjects(params)
//     let found = false
//     finder.on('data', function (data) {
//       assert.strictEqual(data.Contents.length, 2)
//       assert.strictEqual(data.CommonPrefixes.length, 0)
//       found = true
//     })
//     finder.on('end', function () {
//       assert.strictEqual(found, true)
//       done()
//     })
//   })

//   it('downloadDir with deleteRemoved', function (done) {
//     let localDir = path.join(__dirname, 'dir1')
//     let localTmpDir = path.join(tempDir, 'dir1')
//     ncp(localDir, localTmpDir, function (err) {
//       if (err) throw err

//       let client = createClient()
//       let params = {
//         localDir: localTmpDir,
//         deleteRemoved: true,
//         s3Params: {
//           Prefix: remoteDir,
//           Bucket: s3Bucket
//         }
//       }
//       let downloader = client.downloadDir(params)
//       downloader.on('end', function () {
//         assertFilesMd5([
//           {
//             path: path.join(localTmpDir, 'file1'),
//             md5: 'b1946ac92492d2347c6235b4d2611184'
//           },
//           {
//             path: path.join(localTmpDir, 'inner1/a'),
//             md5: 'ebcb2061cab1d5c35241a79d27dce3af'
//           }
//         ], function (err) {
//           if (err) throw err
//           assert.strictEqual(fs.existsSync(path.join(localTmpDir, 'file2')), false)
//           assert.strictEqual(fs.existsSync(path.join(localTmpDir, 'inner2/b')), false)
//           assert.strictEqual(fs.existsSync(path.join(localTmpDir, 'inner2')), false)
//           done()
//         })
//       })
//     })
//   })

//   it('upload folder with delete removed handles updates correctly', function (done) {
//     let client = createClient()
//     let params = {
//       localDir: path.join(__dirname, 'dir3'),
//       deleteRemoved: true,
//       s3Params: {
//         Prefix: remoteDir,
//         Bucket: s3Bucket
//       }
//     }
//     let uploader = client.uploadDir(params)
//     uploader.on('end', function () {
//       // modify a file and upload again. Make sure the list is still intact.
//       fs.writeFileSync(path.join(__dirname, 'dir3', 'index.html'), 'hi')
//       let uploader = client.uploadDir(params)
//       uploader.on('end', function () {
//         let params = {
//           recursive: true,
//           s3Params: {
//             Bucket: s3Bucket,
//             Prefix: remoteDir
//           }
//         }
//         let client = createClient()
//         let finder = client.listObjects(params)
//         let found = false
//         finder.on('data', function (data) {
//           assert.strictEqual(data.Contents.length, 2)
//           assert.strictEqual(data.CommonPrefixes.length, 0)
//           found = true
//         })
//         finder.on('end', function () {
//           assert.strictEqual(found, true)
//           done()
//         })
//       })
//     })
//   })

//   it('uploads folder with lots of files', function (done) {
//     createFolderOfFiles(tempManyFilesDir, 10, 100 * 1024, function () {
//       let client = createClient()
//       let params = {
//         localDir: tempManyFilesDir,
//         deleteRemoved: true,
//         s3Params: {
//           Prefix: remoteManyFilesDir,
//           Bucket: s3Bucket
//         }
//       }
//       let uploader = client.uploadDir(params)
//       uploader.on('end', function () {
//         // get a list of the remote files to ensure they all got created
//         let params = {
//           recursive: true,
//           s3Params: {
//             Bucket: s3Bucket,
//             Prefix: remoteManyFilesDir
//           }
//         }
//         let client = createClient()
//         let finder = client.listObjects(params)
//         let found = false
//         finder.on('data', function (data) {
//           assert.strictEqual(data.Contents.length, 10)
//           found = true
//         })
//         finder.on('end', function () {
//           assert.strictEqual(found, true)
//           done()
//         })
//       })
//     })
//   })

  test('deletes a folder', async () => {
    let client = createClient()
    let s3Params = {
      Prefix: remoteRoot,
      Bucket: s3Bucket
    }
    await client.deleteDir(s3Params)
  })

//   function doDownloadFileTest (done) {
//     fs.unlink(localFile, function (err) {
//       if (err) return done(err)
//       let client = createClient()
//       let params = {
//         localFile: localFile,
//         s3Params: {
//           Key: remoteFile,
//           Bucket: s3Bucket
//         }
//       }
//       let downloader = client.downloadFile(params)
//       downloader.on('error', done)
//       let progress = 0
//       let progressEventCount = 0
//       let gotHttpHeaders = false
//       downloader.on('progress', function () {
//         let amountDone = downloader.progressAmount
//         let amountTotal = downloader.progressTotal
//         let newProgress = amountDone / amountTotal
//         progressEventCount += 1
//         assert(newProgress >= progress, 'old progress: ' + progress + ', new progress: ' + newProgress)
//         progress = newProgress
//       })
//       downloader.on('httpHeaders', function (statusCode, headers, resp) {
//         let contentType = headers['content-type']
//         assert.strictEqual(contentType, 'image/png')
//         gotHttpHeaders = true
//       })
//       downloader.on('end', function () {
//         assert.strictEqual(progress, 1)
//         assert(progressEventCount >= 3, 'expected at least 3 progress events. got ' + progressEventCount)
//         let reader = fs.createReadStream(localFile)
//         let md5sum = crypto.createHash('md5')
//         reader.on('data', function (data) {
//           md5sum.update(data)
//         })
//         reader.on('end', function () {
//           assert.strictEqual(md5sum.digest('hex'), hexdigest)
//           assert.ok(gotHttpHeaders)
//           fs.unlink(localFile, done)
//         })
//       })
//     })
//   }
})

// function assertFilesMd5 (list, cb) {
//   let pend = new Pend()
//   list.forEach(function (o) {
//     pend.go(function (cb) {
//       let inStream = fs.createReadStream(o.path)
//       let hash = crypto.createHash('md5')
//       inStream.pipe(hash)
//       hash.on('data', function (digest) {
//         let hexDigest = digest.toString('hex')
//         assert.strictEqual(hexDigest, o.md5, o.path + ' md5 mismatch')
//         cb()
//       })
//     })
//   })
//   pend.wait(cb)
// }
