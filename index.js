// Required dependencies
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dictionary', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Word Schema
const wordSchema = new mongoose.Schema({
    word: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    definition: {
        type: String,
        required: true
    },
    partOfSpeech: {
        type: String,
        required: true,
        enum: ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection']
    },
    example: {
        type: String
    },
    etymology: {
        type: String
    },
    dateAdded: {
        type: Date,
        default: Date.now
    },
    lastModified: {
        type: Date,
        default: Date.now
    }
});

// Update lastModified on save
wordSchema.pre('save', function(next) {
    this.lastModified = Date.now();
    next();
});

const Word = mongoose.model('Word', wordSchema);

// Routes

// GET all words with pagination
app.get('/api/words', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const words = await Word.find()
            .skip(skip)
            .limit(limit)
            .sort({ word: 1 });

        const total = await Word.countDocuments();

        res.json({
            words,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalWords: total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET search words
app.get('/api/words/search', async (req, res) => {
    try {
        const searchTerm = req.query.q;
        if (!searchTerm) {
            return res.status(400).json({ message: 'Search term is required' });
        }

        const words = await Word.find({
            word: { $regex: searchTerm, $options: 'i' }
        }).limit(10);

        res.json(words);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET single word
app.get('/api/words/:word', async (req, res) => {
    try {
        const word = await Word.findOne({ word: req.params.word.toLowerCase() });
        if (!word) {
            return res.status(404).json({ message: 'Word not found' });
        }
        res.json(word);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST new word
app.post('/api/words', async (req, res) => {
    try {
        const { word, definition, partOfSpeech, example, etymology } = req.body;

        // Check if word already exists
        const existingWord = await Word.findOne({ word: word.toLowerCase() });
        if (existingWord) {
            return res.status(400).json({ message: 'Word already exists' });
        }

        const newWord = new Word({
            word: word.toLowerCase(),
            definition,
            partOfSpeech,
            example,
            etymology
        });

        const savedWord = await newWord.save();
        res.status(201).json(savedWord);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT update word
app.put('/api/words/:word', async (req, res) => {
    try {
        const updatedWord = await Word.findOneAndUpdate(
            { word: req.params.word.toLowerCase() },
            { ...req.body, lastModified: Date.now() },
            { new: true, runValidators: true }
        );

        if (!updatedWord) {
            return res.status(404).json({ message: 'Word not found' });
        }

        res.json(updatedWord);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE word
app.delete('/api/words/:word', async (req, res) => {
    try {
        const deletedWord = await Word.findOneAndDelete({ word: req.params.word.toLowerCase() });
        
        if (!deletedWord) {
            return res.status(404).json({ message: 'Word not found' });
        }

        res.json({ message: 'Word deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));