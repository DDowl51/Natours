// type is 'success' or 'error'
export const showAlert = (type, message) => {
  // Hide alert before showing a new one
  hideAlert();

  const markup = `<div class="alert alert--${type}">${message}</div>`;
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);

  // Close alert after 5s
  setTimeout(hideAlert, 5000);
};

export const hideAlert = () => {
  const alert = document.querySelector('.alert');
  if (alert) alert.parentNode.removeChild(alert);
};
