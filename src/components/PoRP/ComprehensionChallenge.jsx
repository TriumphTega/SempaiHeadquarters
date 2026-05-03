import React, { useState, useEffect } from 'react';

export default function ComprehensionChallenge({ challenge, onSubmit, onClose }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60); // 60 seconds timer
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(60 - Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const handleSubmit = async () => {
    if (selectedAnswer === null) return;
    
    setIsSubmitting(true);
    const responseTime = Date.now() - startTime;
    
    await onSubmit(selectedAnswer, responseTime);
    setIsSubmitting(false);
  };

  const handleTimeout = () => {
    // Auto-submit with no answer on timeout
    onSubmit(-1, 60000); // -1 indicates timeout
  };

  const handleSkip = () => {
    onSubmit(-1, Date.now() - startTime); // Skip counts as no answer
  };

  if (timeRemaining <= 0) {
    handleTimeout();
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Reading Check</h3>
          <span className={`text-sm font-medium ${
            timeRemaining <= 10 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {timeRemaining}s
          </span>
        </div>
        
        <p className="text-gray-700 mb-6 leading-relaxed">
          {challenge.question}
        </p>
        
        <div className="space-y-3 mb-6">
          {challenge.options.map((option, index) => (
            <button
              key={index}
              onClick={() => setSelectedAnswer(index)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedAnswer === index 
                  ? 'border-blue-500 bg-blue-50 shadow-sm transform scale-[1.02]' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              disabled={isSubmitting}
            >
              <span className="font-medium text-gray-900">
                {String.fromCharCode(65 + index)}.
              </span>{' '}
              <span className="text-gray-700">{option}</span>
            </button>
          ))}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={selectedAnswer === null || isSubmitting}
            className={`flex-1 py-3 rounded-lg font-medium transition-all duration-200 ${
              selectedAnswer === null || isSubmitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </button>
          
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 font-medium text-gray-700"
          >
            Skip
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          This helps us verify you're reading the content
        </p>
      </div>
    </div>
  );
}
