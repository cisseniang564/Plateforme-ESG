import { useState } from 'react';
import { Leaf, ArrowLeft } from 'lucide-react';
import Button from '@/components/common/Button';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <Leaf className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-6 text-3xl font-bold">Reset Password</h2>
          <p className="mt-2 text-gray-600">
            {submitted ? "Check your email" : "Enter your email to reset password"}
          </p>
        </div>
        
        <div className="card shadow-xl">
          {submitted ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Email Sent!</h3>
              <p className="text-gray-600 mb-6">We've sent password reset instructions to {email}</p>
              <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Back to login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@company.com"
                  required
                />
              </div>
              
              <Button type="submit" className="w-full">
                Send Reset Link
              </Button>
              
              <a 
                href="/login" 
                className="flex items-center justify-center text-sm text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to login
              </a>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
