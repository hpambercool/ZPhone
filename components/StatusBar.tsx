import React, { useState, useEffect } from 'react';

const StatusBar = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Dynamic Island Area */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-full z-[60] flex items-center justify-center transition-all duration-300 hover:w-[140px] hover:h-[40px]">
        {/* Sensor/Camera simulation */}
        <div className="w-16 h-full flex items-center justify-end pr-2">
            <div className="w-2 h-2 rounded-full bg-indigo-900/30"></div>
        </div>
      </div>

      <div className="w-full h-14 flex justify-between items-start pt-3 px-6 text-white z-50 absolute top-0 left-0 pointer-events-none mix-blend-plus-lighter">
        <div className="font-semibold text-sm tracking-wide w-20">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        
        <div className="flex gap-2 items-center w-20 justify-end">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 0 0-6 0zm-4-4l2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
          </svg>
          <div className="w-6 h-3 border border-white/80 rounded-[4px] relative flex items-center px-[1px]">
            <div className="h-2 w-full bg-white rounded-[2px]"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StatusBar;