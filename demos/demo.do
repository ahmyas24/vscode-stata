* %% Load System Dataset
sysuse auto, clear

* %% Summary Statistics
sum price mpg weight foreign

* %% Bivariate Plot with Nice Labels
* %set graph_width = 8
* %set graph_height = 5
twoway scatter price mpg, ///
    title("Car Price vs. Fuel Economy") ///
    xtitle("Miles per Gallon") ///
    ytitle("Price (USD)") ///
    note("Data: 1978 Automobile Data")

* %% Regression Analysis
regress price mpg weight foreign

* %% Export Results with etable
qui regress price mpg weight foreign
estimates store model1

qui regress price mpg weight foreign length
estimates store model2

etable, estimates(model1 model2) ///
    column(estimates) ///
    showstars showstarsnote ///
    title("Regression Results: Car Price Models")
