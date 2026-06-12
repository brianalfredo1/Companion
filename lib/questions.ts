// Question of the day. The question is derived from the date, so both
// partners always see the same one without any extra database state.

export const QUESTIONS = [
  "What's a smell that reminds you of me?",
  "What was your first impression of me?",
  "Which song feels like *us*?",
  "What's one tiny thing I do that makes you smile?",
  "Where should we travel together next, money no object?",
  "What's your favorite memory of us so far?",
  "What did you think the first time we held hands?",
  "If we had a restaurant, what would it be called?",
  "What's one thing you want us to learn together?",
  "Which fictional couple are we most like?",
  "What's the best meal we've ever shared?",
  "What do you hope we're doing ten years from now?",
  "What's one thing about me that surprised you?",
  "If today had a soundtrack, what song would it be?",
  "What's your favorite photo of us, and why?",
  "What would our couple superpower be?",
  "What's something small I did this week that you noticed?",
  "Which of my habits do you secretly find adorable?",
  "What's a date idea you've never told me about?",
  "What's one word that describes us this month?",
  "If we got a pet tomorrow, what would we name it?",
  "What's the funniest thing that's happened to us?",
  "When do you feel closest to me?",
  "What's one dream of yours I can help with?",
  "What's the best advice we've ever been given?",
  "If we could relive one day together, which one?",
  "What's your favorite thing about waking up... knowing me?",
  "What movie should we absolutely never watch again?",
  "What's a tradition you want us to start?",
  "What's the most beautiful place you want to show me?",
  "What's one thing you're proud of us for?",
  "If our love had a color, what would it be?",
  "What food could you eat with me forever?",
  "What's something new you want to try together this month?",
  "What was the moment you knew you liked me?",
  "What's the silliest argument we've ever had?",
  "What's one thing you'd never change about us?",
  "What's a compliment you've been meaning to give me?",
  "If we wrote a book together, what would it be about?",
  "What's your favorite way I say your name?",
  "Which season feels most like our relationship?",
  "What's one fear that feels smaller because of us?",
  "What's the best gift I've ever given you (big or tiny)?",
  "If we swapped phones for a day, what would worry you most?",
  "What's a place that feels like *ours*?",
  "What's one thing you want more of from me?",
  "What would the title of our movie be?",
  "What's something I taught you without realizing?",
  "What's your favorite lazy-day activity with me?",
  "If we could teleport anywhere right now, where to?",
] as const;

export { localDateKey as todayKey } from "./dates";

export function questionForDate(dateStr: string): string {
  // Sequential rotation by day number: same question for both partners,
  // and no repeats within QUESTIONS.length days.
  const dayNumber = Math.floor(Date.parse(dateStr + "T00:00:00Z") / 86400000);
  return QUESTIONS[((dayNumber % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length];
}
