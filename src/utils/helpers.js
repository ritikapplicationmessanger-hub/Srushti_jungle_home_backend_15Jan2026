const crypto = require('crypto');

// Generate random OTP (fallback if needed)
const generateOTP = (length = 6) => {
  return crypto.randomInt(Math.pow(10, length - 1), Math.pow(10, length)).toString();
};

// Format date to DD-MM-YYYY
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Format date to YYYY-MM-DD (for inputs)
const formatDateInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Calculate number of nights between two dates
const calculateNights = (checkIn, checkOut) => {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diffTime = Math.abs(outDate - inDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Capitalize first letter of string
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Generate unique transaction ID
const generateTransactionId = () => {
  return 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
};

// Validate email format (basic)
const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Deep clone object (simple)
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Sleep utility (for testing or rate limiting)
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

module.exports = {
  generateOTP,
  formatDate,
  formatDateInput,
  calculateNights,
  capitalize,
  generateTransactionId,
  isValidEmail,
  deepClone,
  sleep,
};