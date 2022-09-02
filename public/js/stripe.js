import axios from 'axios';
import { showAlert } from './alert';
const stripe = Stripe(
  'pk_test_51Lct7FEz3UnqBgewi8atdAx6dnLKGjS1n6QphZbrlbIstPUiFpmcJ5fdz5xuUWWVfVe6aRwcyX8HQfdAl7dd3q0800fZp66zBS'
);

export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from api
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);
    // 2) Create checkout form + process charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (error) {
    console.error(error);
    showAlert('error', error);
  }
};
