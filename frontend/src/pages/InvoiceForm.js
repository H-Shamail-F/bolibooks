import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const InvoiceForm = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to main invoices page where the form is now integrated
    navigate('/invoices');
  }, [navigate]);
  
  return (
    <div className="p-6 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to invoices...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mt-4"></div>
      </div>
    </div>
  );
};

export default InvoiceForm;
