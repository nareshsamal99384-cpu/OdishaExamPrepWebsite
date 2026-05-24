import React from 'react';
import PageLayout from './components/PageLayout';

const PrivacyPolicy = () => {
  return (
    <PageLayout backTo={{ path: '/', label: 'Back to Home' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-8">Privacy Policy</h1>

          <div className="space-y-6 text-slate-600 leading-relaxed">
            <p className="font-medium text-slate-900">Last Updated: {new Date().toLocaleDateString()}</p>

            <p>At OdishaExamPrep ("we", "our", "us"), we are committed to protecting your privacy and ensuring that your personal information is handled safely and responsibly. This Privacy Policy outlines how we collect, use, and protect your data when you use our website and services.</p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Information We Collect</h3>
            <p>We may collect personal information such as your name, email address, phone number, and exam preferences when you register an account. We also collect usage data (such as mock test scores) to improve our analytics and provide personalized recommendations.</p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. How We Use Your Information</h3>
            <p>Your information is used to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, maintain, and improve our mock tests and services.</li>
              <li>Process transactions and send related information via secure payment partners.</li>
              <li>Send you technical notices, updates, and security alerts.</li>
              <li>Respond to your customer service queries.</li>
            </ul>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. Information Sharing</h3>
            <p>We do not share, sell, or rent your personal information to marketing third parties. We may share information with trusted third-party service providers (such as payment gateways like Razorpay) strictly for the purpose of facilitating secure transactions.</p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">4. Data Security</h3>
            <p>We implement robust technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">5. Contact Information</h3>
            <p>If you have any questions or concerns about this Privacy Policy, please contact our grievance officer at odishaexamprep365@gmail.com or call +91 7377431715.</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default PrivacyPolicy;
