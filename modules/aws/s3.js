// Error
import Boom from 'boom';
import ERR from '../../error/errorCodes';

// AWS
import AWS from './aws';

const S3 = new AWS.S3();

const config = {
    Bucket: '<BUCKETNAME>'
};

async function upload(obj) {
    const params = { ...config, Key: obj.id, Body: obj.file };

    try {
        await S3.upload(params).promise();
    } catch (error) {
        throw Boom.internal(error, {
            response: ERR.MSG.FILE_NOT_SENT,
            type: ERR.TYPE.SERVER
        });
    }
}

const awsS3 = {
    upload
};

export default awsS3;