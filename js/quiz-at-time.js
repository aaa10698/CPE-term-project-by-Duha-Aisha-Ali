// Import the base Component class and Property helper from Wonderland Engine
import { Component, Property } from '@wonderlandengine/api';
// Import CursorTarget so we can respond to click events on objects
import { CursorTarget } from '@wonderlandengine/components';

// Define a new component class called QuizAtTime
export class QuizAtTime extends Component {
    // Internal name used by Wonderland Engine for this component
    static TypeName = 'quiz-at-time';

    // Define all the properties that can be set from the editor
    static Properties = {
        // Object in the scene that has the video-texture component (e.g., the screen)
        videoObject:  Property.object(),

        // time when the video would pop up
        quizTime:     Property.float(3.0), // default time 

        // Object for answer button A
        buttonA:      Property.object(),
        // Object for answer button B
        buttonB:      Property.object(),
        // Object for answer button C
        buttonC:      Property.object(),

        // The correct answer for this quiz: 'A', 'B', or 'C'
        correctAnswer: Property.string('A'),

        // Object that has a text component to show feedback like "Correct!" or "Try again"
        feedbackObject: Property.object(),
    };

    // Called once when the component starts
    start() {
        // Tracks whether the quiz is currently visible to the player
        this.quizShown = false;
        // Tracks whether this quiz has already been answered correctly
        this.quizCompleted = false;
        // Fallback timer used if we don’t have an actual video time to read from
        this.elapsed = 0.0;

        // Reference to the video-texture component, if we have one
        this.videoComponent = null;
        // If a videoObject has been assigned in the editor…
        if (this.videoObject) {
            // Try to grab the video-texture component from that object
            this.videoComponent = this.videoObject.getComponent('video-texture');
        }
        
        // Reference to the text component used for feedback messages
        this.feedbackText = null;
        // If a feedback object was assigned in the editor…
        if (this.feedbackObject) {
            // Get its text component so we can change the displayed text
            this.feedbackText = this.feedbackObject.getComponent('text');
            // Make sure the feedback is hidden at the start of the experience
            this.feedbackObject.active = false;
        }

        // Connect click handling to button A (if assigned)
        this._setupButton(this.buttonA, 'A');
        // Connect click handling to button B (if assigned)
        this._setupButton(this.buttonB, 'B');
        // Connect click handling to button C (if assigned)
        this._setupButton(this.buttonC, 'C');

        // Hide all buttons until the quiz time is reached
        this._setButtonsActive(false);
    }

    // Called every frame, dt is the time (in seconds) since the last frame
    update(dt) {
        // If this quiz is already done or is currently visible, we don’t need to do anything here
        if (this.quizCompleted || this.quizShown) return;

        // Variable to hold the current time position of the video or fallback timer
        let currentTime = 0.0;

        // If we have a valid video component and an underlying HTML video…
        if (this.videoComponent && this.videoComponent.video) {
            // Use the actual video playback time as our reference
            currentTime = this.videoComponent.video.currentTime;
        } else {
            // Otherwise, just accumulate time using the frame delta (fallback mode)
            this.elapsed += dt;
            // Use the accumulated time as our current time
            currentTime = this.elapsed;
        }

        // If the current time has reached or passed the configured quiz time…
        if (currentTime >= this.quizTime) {
            // Mark that the quiz is now being shown
            this.quizShown = true;

            // If we have a real video playing…
            if (this.videoComponent && this.videoComponent.video) {
                // Pause the video so the player can answer the question
                this.videoComponent.video.pause();
            }
            
            // Show the buttons so the player can choose an answer
            this._setButtonsActive(true);
            // Clear any previous feedback text (but still show the feedback object)
            this._showFeedback('');
        }
    }

    // Helper function to wire a button object to a specific answer option
    _setupButton(object, answer) {
        // If no object was assigned for this button, warn once and exit
        if (!object) {
            console.warn('QuizAtTime: button for', answer, 'not assigned');
            return;
        }

        // Try to get an existing CursorTarget component from this object
        let target = object.getComponent(CursorTarget);
        // If there is no CursorTarget yet, add one so it can receive clicks
        if (!target) target = object.addComponent(CursorTarget);

        // Add a click listener that calls _onAnswer with the correct answer letter
        target.onClick.add(() => this._onAnswer(answer));
    }

    // Called when a button is clicked, with the answer letter ('A', 'B', or 'C')
    _onAnswer(answer) {
        // Ignore clicks if the quiz is not currently visible or already completed
        if (!this.quizShown || this.quizCompleted) return;

        // Check if the clicked answer matches the configured correct answer
        const isCorrect = (answer === this.correctAnswer);

        // If the player chose the correct answer…
        if (isCorrect) {
            // Show a positive feedback message
            this._showFeedback('CORRECT!!!');

            // If we have a video, resume playback
            if (this.videoComponent && this.videoComponent.video) {
                this.videoComponent.video.play();
            }

            // Resume audio
               if (this.audioSource) {
                   this.audioSource.play();
               }
            
            // Hide all the answer buttons now that this question is done
            this._setButtonsActive(false);
            // Mark that the quiz is no longer on screen
            this.quizShown = false;
            // Mark that this question was successfully completed
            this.quizCompleted = true;
        } else {
            // If the answer is wrong, show a “try again” message
            this._showFeedback(' Wrong answer, try again');

            // We deliberately keep the video paused and buttons visible
            // so the player can try again without the video progressing
        }
    }

    // Helper to show or hide all three answer buttons at once
    _setButtonsActive(active) {
        // Show or hide button A if it exists
        if (this.buttonA) this.buttonA.active = active;
        // Show or hide button B if it exists
        if (this.buttonB) this.buttonB.active = active;
        // Show or hide button C if it exists
        if (this.buttonC) this.buttonC.active = active;
    }

    // Helper to display feedback text to the player
    _showFeedback(text) {
        // If we don’t have a feedback object assigned, there is nothing to show
        if (!this.feedbackObject) return;
        // Make sure the feedback object is visible in the scene
        this.feedbackObject.active = true;
        // If we found a text component earlier…
        if (this.feedbackText) {
            // Update the on-screen text to the provided message
            this.feedbackText.text = text;
        }
    }
}
