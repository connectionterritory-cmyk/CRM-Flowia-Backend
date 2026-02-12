export const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPhone = (phone) => {
    // Simple check for now
    return phone && phone.length >= 7;
};

export const required = (value) => {
    return value !== undefined && value !== null && value.toString().trim() !== '';
};
