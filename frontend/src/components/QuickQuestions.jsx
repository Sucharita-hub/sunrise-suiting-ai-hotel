const questions = [
  "What time is check-in?",
  "Is breakfast included?",
  "Does the hotel have a swimming pool?",
  "What is the cancellation policy?",
  "Which room is suitable for 3 guests?",
  "I'd like to book a room"
];

export default function QuickQuestions({ onSelect }) {
  return (
    <div className="quick-questions">
      {questions.map(question => (
        <button key={question} onClick={() => onSelect(question)}>
          {question}
        </button>
      ))}
    </div>
  );
}
