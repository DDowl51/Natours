import { login, logout } from './login';
import { signup } from './signup';
import { displayMap } from './mapbox';
import { updateSettings } from './updateSettings';
import { confirmAccount } from './confirm';
import { bookTour } from './stripe';

// Dom elements
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const signupForm = document.querySelector('.form--signup');
const logoutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const confirmAccountForm = document.querySelector('.message--confirm-account');
const bookBtn = document.getElementById('book-tour');
const cardContainer = document.querySelector('.card-container');
const navBtn = document.querySelector('.nav--btn');
// Values

// Delegation

if (navBtn) {
  navBtn.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector('.header').classList.toggle('nav-open');
  });
}

if (cardContainer) {
  const overlays = document.querySelectorAll('.card__picture-overlay');
  if (overlays) {
    Array.from(overlays).forEach(overlay => {
      const image = overlay.nextSibling;
      overlay.addEventListener('mouseenter', () => {
        image.style.transform = 'scale(1.2)';
      });
      overlay.addEventListener('mouseleave', () => {
        image.style.transform = 'scale(1)';
      });
    });
  }
}

if (mapBox) {
  const location = JSON.parse(mapBox.dataset.locations);
  displayMap(location);
}

if (signupForm) {
  signupForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    signup({ name, email, password, passwordConfirm });
  });
}
if (confirmAccountForm) {
  confirmAccount();
}

if (loginForm) {
  loginForm.addEventListener('submit', event => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', event => {
    event.preventDefault();
    logout();
  });
}

if (userDataForm) {
  userDataForm.addEventListener('submit', event => {
    event.preventDefault();

    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    updateSettings(form, 'data');
  });
}
if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async event => {
    event.preventDefault();
    document.querySelector('.btn--save-password ').textContent = 'Updating...';

    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );

    document.querySelector('.btn--save-password ').textContent =
      'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

if (bookBtn) {
  bookBtn.addEventListener('click', e => {
    e.preventDefault();
    e.target.textContent = 'Processing...';
    const { tourId } = e.target.dataset;
    bookTour(tourId);
  });
}
