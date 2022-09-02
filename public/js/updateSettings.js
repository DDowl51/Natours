import '@babel/polyfill';
import axios from 'axios';
import { showAlert } from './alert';

// type: 'password' or 'data'
export const updateSettings = async (data, type) => {
  // alert(`You are login with ${email} ${password}`);
  try {
    const url = `/api/v1/users/${
      type === 'password' ? 'updatePassword' : 'updateMe'
    }`;
    const res = await axios({ method: 'PATCH', url, data });

    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
      setTimeout(() => {
        location.reload(true);
      }, 1500);
    }
  } catch (error) {
    showAlert('error', error.response.data.message);
  }
};
