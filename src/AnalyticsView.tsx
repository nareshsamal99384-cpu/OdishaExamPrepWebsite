import React from 'react';

const AnalyticsView = ({ user, onNavigate }: { user: any, onNavigate?: (path: string) => void }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
      <h2 className="text-3xl font-bold text-red-500">Analytics Dashboard Missing</h2>
      <p className="text-slate-600">
        It appears the <strong>AnalyticsView.tsx</strong> file was accidentally deleted or not committed. 
        Please restore it from your local backups or Git stash.
      </p>
    </div>
  );
};

export default AnalyticsView;
