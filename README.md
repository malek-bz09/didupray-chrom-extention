DIDUPRAY

DIDUPRAY is a Chrome extension that blocks distracting websites when it is time to pray. This is my first real project, and I built it to solve a problem I run into almost every day: getting pulled into a website and losing track of prayer time.

The Problem

It is easy to open a site "for two minutes" and still be there when adhan comes in. DIDUPRAY removes that excuse by locking certain sites the moment a prayer time starts, and only unlocking them once I confirm I have prayed.

How It Works


The extension fetches daily prayer times for Algiers from the Aladhan API.
A background script checks the current time against those prayer times every minute using the Chrome Alarms API.
When a prayer time starts, the extension blocks a configured list of websites and redirects any attempt to visit them to a "Time to Pray" page.
Opening the extension popup shows either:

The next prayer and a countdown to it, or
The current prayer, if it is adhan time right now.



A "Notify Me" button lets me turn website blocking on or off.
A "Wlh I Prayed" button unlocks the sites again once I am done praying.


Features


Live countdown to the next prayer
Automatic daily prayer time refresh, cached so the extension does not call the API every minute
Website blocking during adhan time, using Chrome's declarativeNetRequest API
A toggle to enable or disable blocking without uninstalling the extension
Basic error handling: if the prayer times API is temporarily down, the extension falls back to the last known times instead of showing nothing


Project Structure

