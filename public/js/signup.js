import '@babel/polyfill';
import axios from 'axios';
import { showAlert } from './alert';

export const signup = async data => {
  // alert(`You are login with ${email} ${password}`);
  document.querySelector('.btn--signup').textContent = 'Loading...';
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/signup',
      data,
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Sign up successfully!');
      setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (error) {
    showAlert('error', error.response.data.message);
  } finally {
    document.querySelector('.btn--signup').textContent = 'Sign up';
  }
};
