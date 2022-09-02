import '@babel/polyfill';
import axios from 'axios';
import { showAlert } from './alert';

export const login = async (email, password) => {
  // alert(`You are login with ${email} ${password}`);
  document.querySelector('.btn--login').textContent = 'Loading...';
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/login',
      data: { email, password },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Log in successfully!');
      setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (error) {
    showAlert('error', error.response.data.message);
  } finally {
    document.querySelector('.btn--login').textContent = 'Login';
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout',
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Log out successfully');
      setTimeout(() => {
        location.reload(true);
      }, 1500);
    }
  } catch (error) {
    showAlert('error', error.response.data.message);
  }
};
