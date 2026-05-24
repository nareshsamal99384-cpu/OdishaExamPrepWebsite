import React from 'react';
import PageLayout from './components/PageLayout';

const TermsOfService = () => {
  return (
    <PageLayout backTo={{ path: '/', label: 'Back to Home' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-8">Terms of Service</h1>

          <div className="space-y-6 text-slate-600 leading-relaxed">
            <p className="font-medium text-slate-900">Last Updated: {new Date().toLocaleDateString()}</p>

            <p>Welcome to OdishaExamPrep. By accessing or using our website and services, you agree to be bound by these Terms of Service. Please read them carefully before making any purchase.</p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Use of Service</h3>
            <p>OdishaExamPrep provides online mock tests, question banks, and educational resources. Your account is for your personal use only. You may not share your login credentials, reproduce, distribute, or exploit our content for commercial purposes without our explicit written consent.</p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. Account Registration</h3>
            <p>You must provide accurate and complete information when creating an account. You are solely responsible for the activity that occurs on your account and for keeping your password secure.</p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. Payments and Pricing</h3>
            <p>All prices are listed in Indian Rupees (INR) and are subject to change without notice. We use trusted third-party payment gateways (Razorpay) to process payments securely. By purchasing a product, you agree to provide valid payment information.</p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">4. Intellectual Property</h3>
            <p>All content included on this site, such as text, graphics, logos, images, and mock questions, is the property of OdishaExamPrep and protected by applicable copyright laws. Any unauthorized use of our intellectual property may result in legal action and account termination.</p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">5. Disclaimer of Warranties</h3>
            <p>While we strive to provide accurate and updated educational material, OdishaExamPrep does not guarantee that our services will completely guarantee your success in any examination. Our materials are for practice and preparation purposes only.</p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">6. Governing Law</h3>
            <p>These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising in connection with these terms shall be subject to the exclusive jurisdiction of the courts in Odisha, India.</p>

            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">7. Contact Information</h3>
            <p>For any queries regarding these Terms of Service, please contact us at odishaexamprep365@gmail.com.</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default TermsOfService;
