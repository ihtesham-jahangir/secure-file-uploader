// types/next-auth.d.ts

import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    // Add other custom properties here
  }

  interface JWT {
    accessToken?: string;
    // Add other custom properties here
  }
}
