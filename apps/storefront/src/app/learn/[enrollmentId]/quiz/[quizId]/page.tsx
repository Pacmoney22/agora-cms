'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { QuizDto, QuizQuestionDto, QuizAttemptDto } from '@/lib/api';
import { getQuiz, submitQuizAttempt, getQuizAttempts } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Answer {
  questionId: string;
  answer: any;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.enrollmentId as string;
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<QuizDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, any>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttemptDto | null>(null);
  const [previousAttempts, setPreviousAttempts] = useState<QuizAttemptDto[]>([]);

  // Fetch quiz
  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      getQuiz(quizId),
      getQuizAttempts(quizId, enrollmentId).catch(() => []),
    ])
      .then(([quizData, attempts]) => {
        setQuiz(quizData);
        setPreviousAttempts(attempts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [quizId, enrollmentId]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => new Map(prev).set(questionId, value));
  };

  const handleNext = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    // Check if all questions are answered
    const unansweredQuestions = quiz.questions.filter(
      (q) => !answers.has(q.id) || answers.get(q.id) === '' || answers.get(q.id) === null
    );

    if (unansweredQuestions.length > 0) {
      if (!confirm(`You have ${unansweredQuestions.length} unanswered question(s). Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const answersArray: Answer[] = Array.from(answers.entries()).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const attempt = await submitQuizAttempt(quiz.id, enrollmentId, answersArray);
      setResult(attempt);
    } catch (err: any) {
      alert(`Failed to submit quiz: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Loading / Error states -----
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500">Loading quiz...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Quiz not found</h2>
        <p className="mt-2 text-sm text-gray-500">
          {error || 'The requested quiz does not exist.'}
        </p>
        <Link
          href={`/learn/${enrollmentId}`}
          className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Back to Course
        </Link>
      </div>
    );
  }

  const questions = quiz.questions.sort((a, b) => a.position - b.position);
  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return null;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const config = quiz.quizConfig || {};
  const passingScore = config.passingScore || 70;

  // ----- Results view -----
  if (result) {
    const passed = result.passed ?? false;
    const scorePercent = result.totalPoints > 0
      ? Math.round((result.score || 0) / result.totalPoints * 100)
      : 0;

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={`/learn/${enrollmentId}`}
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Course
            </Link>
          </div>

          {/* Results card */}
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <div className="text-center">
              <div
                className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                  passed ? 'bg-green-100' : 'bg-red-100'
                }`}
              >
                {passed ? (
                  <svg
                    className="h-12 w-12 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-12 w-12 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>

              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                {passed ? 'Congratulations!' : 'Quiz Not Passed'}
              </h2>

              <div className="mt-6">
                <p className="text-5xl font-bold text-gray-900">{scorePercent}%</p>
                <p className="mt-2 text-sm text-gray-600">
                  You scored {result.score} out of {result.totalPoints} points
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Passing score: {passingScore}%
                </p>
              </div>

              {!passed && (
                <p className="mt-6 text-gray-700">
                  Don't worry! Review the material and try again.
                </p>
              )}
            </div>

            {/* Answer review */}
            <div className="mt-8 border-t border-gray-200 pt-8">
              <h3 className="text-lg font-semibold text-gray-900">Answer Review</h3>

              <div className="mt-4 space-y-6">
                {questions.map((question, idx) => {
                  const userAnswer = answers.get(question.id);
                  const questionData = question.questionData || {};
                  const correctAnswer = questionData.correctAnswer;
                  const explanation = questionData.explanation;
                  let isCorrect = false;

                  // Determine if answer is correct based on question type
                  if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
                    isCorrect = userAnswer === correctAnswer;
                  } else if (question.questionType === 'fill_blank') {
                    isCorrect = userAnswer?.toLowerCase().trim() === correctAnswer?.toLowerCase().trim();
                  }

                  return (
                    <div
                      key={question.id}
                      className={`rounded-lg border-2 p-4 ${
                        isCorrect
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {isCorrect ? (
                          <svg
                            className="h-6 w-6 flex-shrink-0 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-6 w-6 flex-shrink-0 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}

                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            Question {idx + 1} ({question.points} point{question.points !== 1 ? 's' : ''})
                          </h4>
                          <p className="mt-1 text-gray-700">{question.questionText}</p>

                          <div className="mt-3 space-y-2">
                            <div>
                              <span className="text-sm font-medium text-gray-600">Your answer: </span>
                              <span className="text-sm text-gray-900">
                                {userAnswer?.toString() || '(No answer)'}
                              </span>
                            </div>

                            {!isCorrect && correctAnswer && (
                              <div>
                                <span className="text-sm font-medium text-gray-600">Correct answer: </span>
                                <span className="text-sm text-green-700 font-medium">
                                  {correctAnswer.toString()}
                                </span>
                              </div>
                            )}

                            {explanation && (
                              <div className="mt-2 rounded-md bg-white p-3">
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">Explanation: </span>
                                  {explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link
                href={`/learn/${enrollmentId}`}
                className="rounded-md bg-gray-600 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700"
              >
                Back to Course
              </Link>
              <button
                onClick={() => {
                  setResult(null);
                  setAnswers(new Map());
                  setCurrentQuestionIndex(0);
                }}
                className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Retake Quiz
              </button>
            </div>
          </div>

          {/* Previous attempts */}
          {previousAttempts.length > 0 && (
            <div className="mt-8 rounded-lg bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Previous Attempts</h3>
              <div className="mt-4 space-y-2">
                {previousAttempts.map((attempt) => {
                  const attemptScorePercent = attempt.totalPoints > 0
                    ? Math.round((attempt.score || 0) / attempt.totalPoints * 100)
                    : 0;

                  return (
                    <div
                      key={attempt.id}
                      className="flex items-center justify-between rounded-md border border-gray-200 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Attempt {attempt.attemptNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(attempt.completedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">
                          {attemptScorePercent}%
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            attempt.passed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {attempt.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----- Quiz taking view -----
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/learn/${enrollmentId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Course
          </Link>
        </div>

        {/* Quiz card */}
        <div className="rounded-lg bg-white p-8 shadow-sm">
          {/* Quiz header */}
          <div className="border-b border-gray-200 pb-6">
            <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
            {quiz.description && (
              <p className="mt-2 text-gray-600">{quiz.description}</p>
            )}

            <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
              <span>{questions.length} questions</span>
              <span>
                {questions.reduce((sum, q) => sum + q.points, 0)} total points
              </span>
              {passingScore && <span>Passing score: {passingScore}%</span>}
            </div>
          </div>

          {/* Progress indicator */}
          <div className="py-6">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span>
                {Array.from(answers.keys()).length} / {questions.length} answered
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{
                  width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="py-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {currentQuestion.questionText}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
              </p>
            </div>

            <QuestionInput
              question={currentQuestion}
              value={answers.get(currentQuestion.id)}
              onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-6">
            <button
              onClick={handlePrevious}
              disabled={isFirstQuestion}
              className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </button>

            {isLastQuestion ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Next
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Question navigator */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Question Navigator</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {questions.map((question, idx) => {
              const isAnswered = answers.has(question.id) && answers.get(question.id) !== '' && answers.get(question.id) !== null;
              const isCurrent = idx === currentQuestionIndex;

              return (
                <button
                  key={question.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`h-10 w-10 rounded-md text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isAnswered
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionInput component
// ---------------------------------------------------------------------------

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: QuizQuestionDto;
  value: any;
  onChange: (value: any) => void;
}) {
  const questionData = question.questionData || {};

  if (question.questionType === 'multiple_choice') {
    const options = questionData.options || [];
    return (
      <div className="space-y-3">
        {options.map((option: string, idx: number) => (
          <label
            key={idx}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50"
          >
            <input
              type="radio"
              name={question.id}
              value={option}
              checked={value === option}
              onChange={(e) => onChange(e.target.value)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-gray-900">{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.questionType === 'true_false') {
    return (
      <div className="space-y-3">
        <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name={question.id}
            value="true"
            checked={value === 'true' || value === true}
            onChange={() => onChange('true')}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-gray-900">True</span>
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name={question.id}
            value="false"
            checked={value === 'false' || value === false}
            onChange={() => onChange('false')}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-gray-900">False</span>
        </label>
      </div>
    );
  }

  if (question.questionType === 'fill_blank') {
    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here..."
        className="block w-full rounded-md border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    );
  }

  if (question.questionType === 'essay') {
    return (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here..."
        rows={8}
        className="block w-full rounded-md border border-gray-300 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    );
  }

  return <p className="text-sm text-gray-500">Unsupported question type</p>;
}
