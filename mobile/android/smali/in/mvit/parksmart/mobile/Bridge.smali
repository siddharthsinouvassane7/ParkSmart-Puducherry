.class public Lin/mvit/parksmart/mobile/Bridge;
.super Ljava/lang/Object;
.source "Bridge.java"

.field private act:Lin/mvit/parksmart/mobile/MainActivity;

.method public constructor <init>(Lin/mvit/parksmart/mobile/MainActivity;)V
    .registers 2
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lin/mvit/parksmart/mobile/Bridge;->act:Lin/mvit/parksmart/mobile/MainActivity;
    return-void
.end method

.method public saveFile(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    .registers 7
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    iget-object v0, p0, Lin/mvit/parksmart/mobile/Bridge;->act:Lin/mvit/parksmart/mobile/MainActivity;
    iput-object p1, v0, Lin/mvit/parksmart/mobile/MainActivity;->saveName:Ljava/lang/String;
    iput-object p2, v0, Lin/mvit/parksmart/mobile/MainActivity;->saveMime:Ljava/lang/String;
    iput-object p3, v0, Lin/mvit/parksmart/mobile/MainActivity;->saveText:Ljava/lang/String;
    new-instance v1, Lin/mvit/parksmart/mobile/UiTask;
    const/4 v2, 0x1
    invoke-direct {v1, v0, v2}, Lin/mvit/parksmart/mobile/UiTask;-><init>(Lin/mvit/parksmart/mobile/MainActivity;I)V
    invoke-virtual {v0, v1}, Lin/mvit/parksmart/mobile/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V
    return-void
.end method

.method public print(Ljava/lang/String;)V
    .registers 5
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    iget-object v0, p0, Lin/mvit/parksmart/mobile/Bridge;->act:Lin/mvit/parksmart/mobile/MainActivity;
    iput-object p1, v0, Lin/mvit/parksmart/mobile/MainActivity;->printTitle:Ljava/lang/String;
    new-instance v1, Lin/mvit/parksmart/mobile/UiTask;
    const/4 v2, 0x2
    invoke-direct {v1, v0, v2}, Lin/mvit/parksmart/mobile/UiTask;-><init>(Lin/mvit/parksmart/mobile/MainActivity;I)V
    invoke-virtual {v0, v1}, Lin/mvit/parksmart/mobile/MainActivity;->runOnUiThread(Ljava/lang/Runnable;)V
    return-void
.end method

.method public platform()Ljava/lang/String;
    .registers 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation
    const-string v0, "android"
    return-object v0
.end method
