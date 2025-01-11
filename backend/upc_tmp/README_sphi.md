Real-time worldwide monitoring of ionospheric scintillation (RT-WMIS) Products README
gAGE/UPC Research Team

I. Introduction
This repository provides users access to our scintillation products, which are delivered in the framework of an ESA contract. The products are obtained using the geodetic detrending (GD) methodology.

II. Data Format
The products are delivered in a daily frame, each with a filename of 'sphi.tmp'. They include the following data fields:
1: it0, Time epoch of the data record, in second.
2: sta_name, 4-character station name.
3: isat, satellite PRN number (GPS 1-32, Galileo 41-80).
4: elevation, in degree.
5: azimuth, in degree.
6: sphiL1 (Sigma60), delivered sigma-phi product on frequency L1, in radian.
7: sphiLc, delivered sigma-phi product on ionosphere-free signal Lc, in meter.
8: Ndat(sphiL1), number of data used for calculating corresponding sphiL1.
9: Ndat(sphiLc), number of data used for calculating corresponding sphiLc.
10: Ndat(bt), number of data used for performing Butterworth High-Pass Filter.

III. Contact Information
Yu Yin (yu.yin@upc.edu) & Guillermo González Casado (guillermo.gonzalez@upc.edu)
Research group of Astronomy and GEomatics (gAGE)
Universitat Politècnica de Catalunya (UPC)
Edifici Omega, Campus Nord
C/Jordi Girona, 1-3
E-08034 Barcelona, Spain
http://www.gage.upc.edu
