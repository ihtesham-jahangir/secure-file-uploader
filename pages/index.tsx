import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';
import Image from 'next/image';
import { FaGoogle, FaSignOutAlt } from 'react-icons/fa';
import Dashboard from './dashboard';
import { useRouter } from 'next/router';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showSubscribeModal, setShowSubscribeModal] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasSubscribed, setHasSubscribed] = useState<boolean>(false);

  useEffect(() => {
    const subscribedFlag = localStorage.getItem('hasSubscribed');
    if (subscribedFlag === 'true') {
      setHasSubscribed(true);
    }

    if (status === 'unauthenticated' && subscribedFlag !== 'true') {
      setShowSubscribeModal(true);
    } else {
      setShowSubscribeModal(false);
    }

    if (router.query.error) {
      if (router.query.error === 'AccessDenied') {
        setSubscriptionStatus('Access denied. Your email is not approved yet.');
      }
    }
  }, [status, router.query.error]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubscriptionStatus('');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubscriptionStatus('Subscription request sent! Please wait for approval.');
        setEmail('');
        setHasSubscribed(true);
        localStorage.setItem('hasSubscribed', 'true');
      } else {
        const data = await response.json();
        setSubscriptionStatus(`Error: ${data.message}`);
      }
    } catch (error: any) {
      setSubscriptionStatus(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-br from-blue-400 to-purple-500 p-6 h-full">
      <header className="w-full flex justify-between items-center mb-12 p-6 bg-white bg-opacity-80 rounded-md shadow-lg">
        <h1 className="text-4xl font-bold text-gray-900">Alpha Secure File Uploader</h1>
        {!session ? (
          <button
            onClick={() => signIn('google')}
            className="flex items-center bg-black text-white hover:bg-gray-800 transition-all px-6 py-2 rounded-lg"
          >
            <FaGoogle className="mr-2" />
            Sign in with Google
          </button>
        ) : (
          <div className="flex items-center space-x-4">
            <Image
              src={session.user?.image || '/default-avatar.png'}
              alt="User Avatar"
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-gray-900 font-medium">Hello, {session.user?.name}</span>
            <button
              onClick={() => signOut()}
              className="flex items-center bg-red-500 text-white hover:bg-red-600 transition-all px-4 py-2 rounded-lg"
            >
              <FaSignOutAlt className="mr-2" />
              Sign Out
            </button>
          </div>
        )}
      </header>

      <main className="w-full flex-1 flex justify-center items-center space-y-8">
        {session ? (
          <Dashboard />
        ) : (
          <div className="text-center text-gray-700 bg-white bg-opacity-80 p-6 rounded-md shadow-lg">
            <Image
              src="/encryption.svg"
              alt="Encryption Illustration"
              width={300}
              height={300}
              className="mx-auto"
            />
            <p className="mt-4 text-lg">Securely upload and encrypt your files to your Google Drive.</p>
          </div>
        )}
      </main>

      {/* Subscription Modal */}
      {showSubscribeModal && !session && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full relative shadow-xl">
            {/* Close (X) Button */}
            <button
              onClick={() => setShowSubscribeModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              aria-label="Close Subscription Modal"
            >
              &times;
            </button>

            <h2 className="text-2xl font-bold mb-4">Subscribe for Access</h2>
            <p className="mb-4">Please enter your email to request access to our website. We will contact you once approved.</p>
            <form onSubmit={handleSubscribe} className="flex flex-col">
              <input
                type="email"
                required
                placeholder="Your Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mb-4 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Subscribe'}
              </button>
            </form>
            {subscriptionStatus && (
              <p
                className={`mt-4 text-sm ${
                  subscriptionStatus.startsWith('Error') ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {subscriptionStatus}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-gray-800 text-white py-4 mt-12">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm">
            Developed by <span className="font-semibold">Ihtesham Jahangir</span> at{' '}
            <a href="https://alphanetwork.com.pk" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-400">
              Alpha Network
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
