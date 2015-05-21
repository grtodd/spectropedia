# Introduction #

How to update data in the spectropedia.  Right now this is based on a custom spreadsheet from ICASA.  You will need to formulate your own import routines for anything else.

# Details #

Step 1: Open your spreadsheet in Google Docs or Open Office and make your changes.

Step 2: File -> Download/Export -> CSV

Step 3: In the data/ directory of your Spectropedia installation there are two important files:

> za.json -> This is the data file Spectropedia uses to populate the display

> parse\_csv.py -> This is the script which converts the CSV file to za.json

> So, to do the conversion from the data/ directory run as follows:

> ./parse\_csv.py path/to/ZA.csv > ./za.json

Step 4: Immediately email antoine when it doesn't do what you expect - there's a lot of massaging going on behind the scenes so 99.99% of the time the bad will be mine!