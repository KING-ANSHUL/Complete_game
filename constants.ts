import { AnimalIcon } from './components/icons/AnimalIcon';
import { BirdIcon } from './components/icons/BirdIcon';
import { FruitIcon } from './components/icons/FruitIcon';
import { LandscapeIcon } from './components/icons/LandscapeIcon';
import { MonumentIcon } from './components/icons/MonumentIcon';
import { WaterBodyIcon } from './components/icons/WaterBodyIcon';
import { WonderIcon } from './components/icons/WonderIcon';

export const TOTAL_GAME_TIME = 600; // in seconds

export const COLOR_MATCH_OPTIONS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Purple', hex: '#a855f7' },
];

export const TALKERS_CAVE_SCENES = {
  'Doctor and Patient': ['Doctor', 'Patient'],
  'Shopkeeper and Customer': ['Shopkeeper', 'Customer'],
  'Waiter and Customer': ['Waiter', 'Customer'],
};

export const TALKERS_CAVE_SCENE_IMAGES: { [key: string]: string } = {
  'Doctor and Patient': '/scene-doctor-patient.png',
  'Shopkeeper and Customer': '/scene-shopkeeper-customer.png',
  'Waiter and Customer': '/scene-waiter-customer.png',
};

export const TALKERS_CAVE_CHARACTER_IMAGES: { [key: string]: string } = {
  'Doctor': '/character-doctor.png',
  'Patient': '/character-patient.png',
  'Shopkeeper': '/character-shopkeeper.png',
  'Customer': '/character-customer.png',
  'Waiter': '/character-waiter.png',
};

export const WONDERLAND_TOPICS = [
    { name: 'Animals', icon: AnimalIcon },
    { name: 'Birds', icon: BirdIcon },
    { name: 'Landscapes', icon: LandscapeIcon },
    { name: 'Water Bodies', icon: WaterBodyIcon },
    { name: 'Fruits', icon: FruitIcon },
    { name: 'Wonders of the World', icon: WonderIcon },
    { name: 'Monuments', icon: MonumentIcon },
];

export const WONDERLAND_SUBTOPICS: { [key: string]: string[] } = {
  'Animals': ['Lion', 'Tiger', 'Elephant', 'Panda', 'Giraffe', 'Monkey', 'Zebra'],
  'Birds': ['Eagle', 'Parrot', 'Peacock', 'Penguin', 'Owl', 'Hummingbird', 'Flamingo'],
  'Landscapes': ['a Snowy Mountain', 'a Sandy Desert', 'a Green Valley', 'a Huge Waterfall', 'a Grassy Field', 'a Tropical Beach'],
  'Water Bodies': ['The Pacific Ocean', 'The River Nile', 'A large blue lake', 'A small quiet pond', 'A massive glacier', 'A colorful Coral Reef'],
  'Fruits': ['a red Apple', 'a yellow Banana', 'a sweet Mango', 'a red Strawberry', 'a juicy Orange', 'a bunch of Grapes'],
  'Wonders of the World': ['The Taj Mahal', 'The Great Wall of China', 'The Colosseum in Rome', 'Machu Picchu', 'Christ the Redeemer', 'The ancient city of Petra'],
  'Monuments': ['The Eiffel Tower', 'The Statue of Liberty', 'The Pyramids of Giza', 'Stonehenge', 'The Red Fort in India', 'The Gateway of India'],
};

export const GRAMMAR_GROOT_TOPICS = [
  'Subject-Verb Agreement',
  'Tenses (Past, Present, Future)',
  'Articles (a, an, the)',
  'Pronouns',
  'Prepositions',
  'Conjunctions',
  'Modals (can, must, should, etc.)',
  'Question Formation',
  'Direct and Indirect Speech',
  'Active and Passive Voice',
  'Adjectives and Adverbs',
  'Reported Speech',
  'Sentence Types (Declarative, Interrogative, etc.)',
  'Subject and Object distinction',
  'Conditional Sentences',
  'Punctuation and Intonation',
  'Clauses (Main and Subordinate)',
  'Determiners',
  'Gerunds and Infinitives',
  'Comparative and Superlative Forms',
];
