import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_USER_POOL_ID,
  ClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
});

export function signIn(email, password) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const details = new AuthenticationDetails({
      Username: email,
      Password: password,
    });
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(session),
      onFailure: (err) => reject(err),
    });
  });
}

export function getIdToken() {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err, session) => {
      if (err || !session || !session.isValid()) return resolve(null);
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

export function signOut() {
  const user = userPool.getCurrentUser();
  if (user) {
    user.signOut();
  }
}

export function signUp(email, password) {
  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, [], null, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}

export function emailConfirmation(email, code) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.confirmRegistration(code, true, function (err, result) {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}

export function resendCode(email) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.resendConfirmationCode(function (err, result) {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}

export function forgotPassword(email) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.forgotPassword({
      onSuccess: function (data) {
        resolve(data);
      },
      onFailure: function (err) {
        reject(err);
      },
      inputVerificationCode: null,
    });
  });
}

export function resetPassword(email, code, newPassword) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.confirmPassword(code, newPassword, {
      onSuccess: function () {
        resolve();
      },
      onFailure: function (err) {
        reject(err);
      },
    });
  });
}

export function changePassword(oldPassword, newPassword) {
  return new Promise((resolve, reject) => {
    const user = userPool.getCurrentUser();
    if (!user) {
      reject(new Error("Not signed in"));
      return;
    }
    user.getSession((sessionErr, session) => {
      if (sessionErr || !session || !session.isValid()) {
        reject(sessionErr || new Error("Session expired"));
        return;
      }
      user.changePassword(oldPassword, newPassword, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  });
}