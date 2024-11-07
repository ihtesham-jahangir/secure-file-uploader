// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com', 'source.unsplash.com','images.unsplash.com','media.istockphoto.com','wallpaperaccess.com'], // Add other domains as needed
  },
};

module.exports = nextConfig;
