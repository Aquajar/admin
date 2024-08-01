/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

const withPWA = require('next-pwa')({
	dest: 'public',
	disable: process.env.NODE_ENV === 'development',
	register: true,
	scope: '/',
	// sw: 'service-worker.js',
	skipWaiting: true,
});

 
module.exports = withPWA(nextConfig);