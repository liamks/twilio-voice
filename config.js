module.exports = {
  twilio : {
    accountSID : 'ACc490a107e47de3969dc55d8e36a6c07e',
    authToken : '1dd657941fcd761e2a6a772cbea6157f'
  },
  watson : {
    speechToText : {
      url: 'https://stream.watsonplatform.net/speech-to-text/api',
      username: '2bf7fa6c-3672-4792-9faa-ac301889a124',
      password: 'kpfi34u2eYcV'
    },
    textToSpeech : {
      url: 'https://stream.watsonplatform.net/text-to-speech/api',
      username: 'f82f8c50-402d-4342-84c7-3f15e6e6ddc3',
      password : 'EdwUmGSmT7rH'
    }
  },
  /*
  S3 AMI user must have AmazonS3FullAccess policy attached
  */
  aws : {
    accessKeyId: 'AKIAJJRICSUIFY6CFBYA',
    secretAccessKey : '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',
    region : 'us-east-1',
    bucket : 'twilio-ad-telephony',
    url : 'https://s3.amazonaws.com/'
  }
};