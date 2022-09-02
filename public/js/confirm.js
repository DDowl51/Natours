import axios from 'axios';

export const confirmAccount = async () => {
  // alert(`You are login with ${email} ${password}`);
  const token = document.querySelector('.token').dataset.token;
  console.log(token);
  try {
    const res = await axios({
      method: 'GET',
      url: `http://127.0.0.1:3000/api/v1/users/confirm/${token}`,
    });

    if (res.data.status === 'success') {
      document.querySelector('.message_msg').textContent =
        'Account confirmed successfully! Now going to main page.';
      setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (error) {
    document.querySelector(
      '.message_msg'
    ).textContent = `Error: ${error.response.data.message}`;
  }
};
