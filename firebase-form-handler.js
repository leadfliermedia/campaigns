
// Adaptive Form Submission Handler - Works with any campaign
// Dynamically collects all form fields including arrays and sends to Firebase Firestore

document.getElementById('myform').addEventListener('submit', async function (e) {
    e.preventDefault();

    console.log('=== FORM SUBMISSION STARTED ===');

    try {
        // Get campaign name from hidden field (adaptive - works for any campaign)
        const campaignName = document.querySelector('input[name="campaign_name"]').value;
        console.log('Campaign Name:', campaignName);

        // Dynamically collect ALL form data (adaptive approach - handles arrays)
        const formData = {};
        const formElements = document.getElementById('myform').elements;
        const processedFields = new Set(); // Track fields already processed

        for (let i = 0; i < formElements.length; i++) {
            const element = formElements[i];

            // Skip hidden fields and submit buttons
            if (element.type === 'hidden' || element.type === 'submit') {
                continue;
            }

            const fieldName = element.name;

            // Skip if already processed (for multi-value fields)
            if (!fieldName || processedFields.has(fieldName)) {
                continue;
            }

            // Handle checkboxes (can be multiple with same name)
            if (element.type === 'checkbox') {
                const checkboxes = document.querySelectorAll(`input[name="${fieldName}"]:checked`);
                if (checkboxes.length > 0) {
                    // If multiple checkboxes with same name, create array
                    if (checkboxes.length > 1 || document.querySelectorAll(`input[name="${fieldName}"]`).length > 1) {
                        formData[fieldName] = Array.from(checkboxes).map(cb => cb.value);
                    } else {
                        // Single checkbox
                        formData[fieldName] = checkboxes[0].value;
                    }
                }
                processedFields.add(fieldName);
                continue;
            }

            // Handle multi-select dropdown
            if (element.type === 'select-multiple') {
                const selectedOptions = Array.from(element.selectedOptions).map(opt => opt.value);
                if (selectedOptions.length > 0) {
                    formData[fieldName] = selectedOptions.length > 1 ? selectedOptions : selectedOptions[0];
                }
                processedFields.add(fieldName);
                continue;
            }

            // Handle regular inputs and single selects
            const fieldValue = element.value;
            if (fieldName && fieldValue) {
                formData[fieldName] = fieldValue;
            }
            processedFields.add(fieldName);
        }

        // Add submission metadata
        formData.submitted_at = new Date();

        console.log('Form Data:', formData);
        console.log('Firebase DB object:', db);

        // Validate that db is defined
        if (!db) {
            console.error('ERROR: Firestore (db) is not initialized!');
            console.error('Make sure firebase-app.js and firebase-firestore.js are loaded');
            throw new Error('Firestore database is not initialized. Check Firebase SDK loading.');
        }

        // Create/get the submission document reference
        const submissionRef = db.collection('campaigns').doc(campaignName);
        console.log('Submission Ref Path:', `campaigns/${campaignName}`);

        // Step 1: Add lead to leads subcollection
        console.log('Step 1: Adding lead to subcollection...');
        const leadDocRef = await submissionRef.collection('leads').add(formData);
        console.log('✅ Lead added successfully with ID:', leadDocRef.id);

        // Step 2: Update submission document with metadata
        console.log('Step 2: Updating submission metadata...');
        await submissionRef.set({
            created_at: new Date(),
            campaign_name: campaignName
        }, { merge: true });
        console.log('✅ Submission metadata updated successfully');

        console.log('=== FORM SUBMISSION SUCCESSFUL ===');

        // Trigger custom event for form success (HTML handles hide/show)
        document.dispatchEvent(new CustomEvent('formSubmissionSuccess'));

    } catch (error) {
        console.error('=== ERROR SUBMITTING FORM ===');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Full Error:', error);

        // Specific error messages
        if (error.code === 'permission-denied') {
            alert('❌ PERMISSION DENIED:\n\nYour Firestore security rules are blocking submissions.\n\nMake sure you updated the rules in Firebase Console → Cloud Firestore → Rules tab.');
        } else if (error.code === 'invalid-argument') {
            alert('❌ INVALID DATA:\n\nOne of the form fields contains invalid data.\n\nError: ' + error.message);
        } else if (error.message.includes('not initialized')) {
            alert('❌ FIREBASE NOT INITIALIZED:\n\nFirebase SDK is not loading correctly.\n\nCheck your internet connection and refresh the page.');
        } else {
            alert('❌ ERROR: ' + error.message + '\n\nCheck browser console for details.');
        }
    }
});