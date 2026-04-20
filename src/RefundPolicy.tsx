import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-200">
        <Link to="/" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-8">Cancellation & Refund Policy</h1>
        
        <div className="space-y-6 text-slate-600 leading-relaxed">
          <p className="font-medium text-slate-900">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <p>At OdishaExamPrep, we are committed to providing high-quality digital mock tests and study resources. Due to the digital nature of our products, our refund policy follows strict guidelines to ensure fairness and prevent misuse of our platform.</p>
          
          <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Digital Products</h3>
          <p>Because all our products (Mock Tests, Question Banks, and Test Series) are digital and instantly accessible upon successful payment, we generally <strong>do not offer refunds</strong> once a purchase is successfully processed and the content is mapped to your account.</p>
          
          <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. Exceptional Circumstances for Refunds</h3>
          <p>We may consider issuing a refund within <strong>3-5 working days</strong> only under the following exceptional circumstances:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Double Deduction:</strong> If your card was charged twice for a single transaction due to a technical glitch.</li>
            <li><strong>Non-Delivery:</strong> If money was deducted from your bank but the premium features were not activated in your account within 24 hours.</li>
            <li><strong>Major Defect:</strong> If the purchased digital course or test series is proven to be completely inaccessible or profoundly defective, and our technical team fails to resolve the issue within 48 hours of reporting.</li>
          </ul>

          <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. Refund Request Process</h3>
          <p>To request a refund under the exceptional circumstances mentioned above, please follow these steps:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Email our support team at <strong>odishaexamprep365@gmail.com</strong> within <strong>48 hours</strong> of the transaction.</li>
            <li>Include your registered email address, transaction ID, payment screenshot, and a clear reason for the refund request.</li>
          </ol>
          <p>Refunds are processed at the sole discretion of the OdishaExamPrep management team after a thorough review of the system logs.</p>

          <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">4. Refund Processing Time</h3>
          <p>If your refund is approved, it will be initiated immediately. However, it may take <strong>5 to 7 business days</strong> for the amount to reflect in your original payment method, depending on your bank or payment provider (e.g., Razorpay).</p>

          <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">5. Contact Data</h3>
          <p>If you face any payment-related issues, please reach out to us at odishaexamprep365@gmail.com or +91 7377431715.</p>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
