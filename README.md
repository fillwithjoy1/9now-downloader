# Disclaimer
YOU are responsible for complying with all local laws and regulations, including but not limited to copyright laws and the terms of service of any websites accessed.
I assume **NO** liability for any misuse of the software or for any infringement of third-party rights by users.
This software is provided 'as is,' without warranty of any kind, express or implied.

# About this branch
This branch is heavily focused on stable code that works consistently,
even at the expense of extra CPU or Memory usage.

Currently the main differences in this branch are:
* Creating and closing browsers entirely instead of reusing a single browser
  * When using Firefox, this forces Firefox to re-download DRM plugins
* Includes a helpful jobs.py wrapper script that re-runs jobs.ts upon an error
  * Usually network errors are the main cause of exceptions
  * Also playlists that are done successfully are marked as done
  * Once it detects all the jobs have been done, the python script exits