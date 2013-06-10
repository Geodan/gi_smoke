# than comments are only set by a leading pound sign
# and projectfilename really should be the very first item 
# in this file
# please leave all the other items landscapefile adjustments file 
# etc empty unless you want to override the project file. 
#
version=42
adjustmentfile=/var/www/wildfire/input/Factor_1.ADJ
fuelmoisturefile=/var/www/wildfire/input/Low.FMS
fuelmodelfile=
weatherfile0={weatherfile}
windFile0={windfile}
landscapefile=/var/www/wildfire/output/landscape.lcp
burnperiodefile=
timestep={timestep}
visiblestep={visiblestep}
secondaryvisiblestep={secondaryvisiblestep}
perimeterresolution=60m
distanceresolution=30
enablecrownfire=true
linkcrowndensityandcover=false
embersfromtorchingtrees=true
enablespotfiregrowth=false
nwnsbackingros=false
distanceChecking=fireLevel
simulatePostFrontalCombustion=false
fuelInputOption=absent
calculationPrecision=normal
useConditioningPeriod = true
conditMonth = {conditMonth}
conditDay = {conditDay}
startMonth = {startMonth}
startDay = {startDay}
startHour = {startHour}
startMin = {startMin}
endMonth = {endMonth}
endDay = {endDay}
endHour = {endHour}
endMin = {endMin}
ignitionFile = {vctfile}
ignitionFileType = {vcttype}
vectMake = false
# Therefore we don't need the vectorFilename property
shapeMake = true
shapeFile = /var/www/wildfire/output/bergen{id}_perim.shp
rastMake = true
rasterFilename = /var/www/wildfire/output/bergen{id}_raster
#Now explicitly set ALL raster options..do not rely on defaults
rast_arrivaltime = true
rast_fireIntensity = true
rast_spreadRate = true
rast_flameLength = false
rast_heatPerArea = false
rast_crownFire = false
rast_fireDirection = false
rast_reactionIntensity = false
