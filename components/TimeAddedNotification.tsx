import React from 'react';

interface TimeAddedNotificationProps {
  amount: number;
}

export const TimeAddedNotification: React.FC<TimeAddedNotificationProps> = ({ amount }) => {
  return (
    <div className="fixed top-1/2 left-1/2 z-50 bg-gradient-to-br from-green-400 to-cyan-500 text-white font-bold px-8 py-6 rounded-2xl shadow-2xl text-center pop-in-fade-out pointer-events-none">
      <p className="text-3xl" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}>Well Done!</p>
      <p className="text-6xl mt-2 font-extrabold" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}>+{amount}s</p>
      <p className="text-xl mt-4" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}>Added to your progress bar!</p>
    </div>
  );
};
