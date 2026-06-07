// Motivational quotes utility

export interface Quote {
  text: string;
  author: string;
}

const MOTIVATIONAL_QUOTES: Quote[] = [
  {
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    author: "Aristotle"
  },
  {
    text: "Atomic habits: small changes that make a big difference.",
    author: "James Clear"
  },
  {
    text: "The secret of your future is hidden in your daily routine.",
    author: "Mike Murdock"
  },
  {
    text: "It is easier to prevent bad habits than to break them.",
    author: "Benjamin Franklin"
  },
  {
    text: "Motivation is what gets you started. Habit is what keeps you going.",
    author: "Jim Ryun"
  },
  {
    text: "Success is the sum of small efforts, repeated day in and day out.",
    author: "Robert Collier"
  },
  {
    text: "Your habits will determine your future.",
    author: "Jack Canfield"
  },
  {
    text: "First we make our habits, then our habits make us.",
    author: "John Dryden"
  },
  {
    text: "You will never change your life until you change something you do daily.",
    author: "John C. Maxwell"
  },
  {
    text: "If you think you can, or you think you can't, you're right.",
    author: "Henry Ford"
  },
  {
    text: "Great things are done by a series of small things brought together.",
    author: "Vincent Van Gogh"
  },
  {
    text: "Consistency is key. If you can't be consistent, you can't be anything.",
    author: "Tony Robbins"
  },
  {
    text: "Quality is not an act, it is a habit.",
    author: "Aristotle"
  },
  {
    text: "All big things come from small beginnings. The seed of every habit is a single, tiny decision.",
    author: "James Clear"
  },
  {
    text: "The chains of habit are too weak to be felt until they are too strong to be broken.",
    author: "Samuel Johnson"
  }
];

/**
 * Get a deterministic Quote of the Day based on the current date.
 * Ensures the quote is stable for 24 hours.
 */
export const getQuoteOfTheDay = (): Quote => {
  const today = new Date();
  const dateNum = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = dateNum % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[index];
};
