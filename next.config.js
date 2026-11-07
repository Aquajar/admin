/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	// Trip review was merged into the vehicle log.
	async redirects() {
		return [{ source: '/trips', destination: '/vehicle-log', permanent: false }];
	},
};

const withPWA = require('next-pwa')({
	dest: 'public',
	disable: process.env.NODE_ENV === 'development',
	register: false,
	scope: '/',
	// sw: 'service-worker.js',
	skipWaiting: true,
});


module.exports = withPWA(nextConfig);