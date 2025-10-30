import cron from 'node-cron';
import { exec } from 'child_process';

const EPG_GRABBER_COMMAND = 'npx epg-grabber --channels=france --output=./public/epg/guide.xml';

const runEpgGrabber = () => {
  console.log('Scheduler: Running EPG Grabber...');
  exec(EPG_GRABBER_COMMAND, (error, stdout, stderr) => {
    if (error) {
      console.error(`Scheduler Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Scheduler Stderr: ${stderr}`);
      return;
    }
    console.log(`Scheduler Stdout: ${stdout}`);
    console.log('Scheduler: EPG data updated successfully.');
  });
};

console.log('Scheduler started.');

// Run once at startup
runEpgGrabber();

// Schedule to run every hour
cron.schedule('0 * * * *', () => {
  runEpgGrabber();
});
