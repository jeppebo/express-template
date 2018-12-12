import 'babel-polyfill';
import chai from 'chai';
import chaiHttp from 'chai-http';
import request from 'supertest';
import app from '../app';

const { expect } = chai;

// chai.use(chaiHttp);

const getCookieValue = (res, name) => {
    const csrf = res.headers['set-cookie'].filter(cookie => cookie.split('=')[0] === name);

    if (csrf) {
        return csrf[0].split(';')[0].split('=')[1];
    }

    return null;
}

const agent = request.agent(app);

let cookie;
let csrfToken;


describe('Auth', () => {
    beforeEach((done) => {
        agent
            .get('/auth/register')
            .end((err, res) => {
                if (err) return done(err);

                csrfToken = getCookieValue(res, 'CSRF');
                cookie = res.headers['set-cookie'];

                return done();
            });
    });

    it('Should login', (done) => {
        agent
            .post('/auth/login')
            .set('Cookie', cookie)
            .set('Referer', 'http://localhost:1928/login')
            .set('Host', 'localhost:1928')
            .set('x-csrf-token', csrfToken)
            .send({
                email: 'jinxcifer@gmail.com',
                password: '123456'
            })
            .expect(200, done);
    });
});