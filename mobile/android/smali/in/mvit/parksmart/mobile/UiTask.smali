.class public Lin/mvit/parksmart/mobile/UiTask;
.super Ljava/lang/Object;
.source "UiTask.java"
.implements Ljava/lang/Runnable;

.field private act:Lin/mvit/parksmart/mobile/MainActivity;
.field private mode:I

.method public constructor <init>(Lin/mvit/parksmart/mobile/MainActivity;I)V
    .registers 3
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lin/mvit/parksmart/mobile/UiTask;->act:Lin/mvit/parksmart/mobile/MainActivity;
    iput p2, p0, Lin/mvit/parksmart/mobile/UiTask;->mode:I
    return-void
.end method

.method public run()V
    .registers 7
    iget-object v0, p0, Lin/mvit/parksmart/mobile/UiTask;->act:Lin/mvit/parksmart/mobile/MainActivity;
    iget v1, p0, Lin/mvit/parksmart/mobile/UiTask;->mode:I
    const/4 v2, 0x1
    if-ne v1, v2, :cond_print
    :try_start_0
    new-instance v1, Landroid/content/Intent;
    const-string v2, "android.intent.action.CREATE_DOCUMENT"
    invoke-direct {v1, v2}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V
    const-string v2, "android.intent.category.OPENABLE"
    invoke-virtual {v1, v2}, Landroid/content/Intent;->addCategory(Ljava/lang/String;)Landroid/content/Intent;
    iget-object v2, v0, Lin/mvit/parksmart/mobile/MainActivity;->saveMime:Ljava/lang/String;
    if-nez v2, :cond_hasmime
    const-string v2, "text/plain"
    :cond_hasmime
    invoke-virtual {v1, v2}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;
    const-string v2, "android.intent.extra.TITLE"
    iget-object v3, v0, Lin/mvit/parksmart/mobile/MainActivity;->saveName:Ljava/lang/String;
    invoke-virtual {v1, v2, v3}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;
    const/4 v2, 0x2
    invoke-virtual {v0, v1, v2}, Lin/mvit/parksmart/mobile/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0
    return-void
    :catch_0
    move-exception v1
    const/4 v1, 0x0
    iput-object v1, v0, Lin/mvit/parksmart/mobile/MainActivity;->saveText:Ljava/lang/String;
    const-string v1, "This phone cannot save files"
    invoke-virtual {v0, v1}, Lin/mvit/parksmart/mobile/MainActivity;->toast(Ljava/lang/String;)V
    return-void

    :cond_print
    :try_start_1
    const-string v1, "print"
    invoke-virtual {v0, v1}, Lin/mvit/parksmart/mobile/MainActivity;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;
    move-result-object v1
    check-cast v1, Landroid/print/PrintManager;
    iget-object v2, v0, Lin/mvit/parksmart/mobile/MainActivity;->printTitle:Ljava/lang/String;
    if-nez v2, :cond_hastitle
    const-string v2, "ParkSmart"
    :cond_hastitle
    iget-object v3, v0, Lin/mvit/parksmart/mobile/MainActivity;->web:Landroid/webkit/WebView;
    invoke-virtual {v3, v2}, Landroid/webkit/WebView;->createPrintDocumentAdapter(Ljava/lang/String;)Landroid/print/PrintDocumentAdapter;
    move-result-object v3
    const/4 v4, 0x0
    invoke-virtual {v1, v2, v3, v4}, Landroid/print/PrintManager;->print(Ljava/lang/String;Landroid/print/PrintDocumentAdapter;Landroid/print/PrintAttributes;)Landroid/print/PrintJob;
    :try_end_1
    .catch Ljava/lang/Exception; {:try_start_1 .. :try_end_1} :catch_1
    return-void
    :catch_1
    move-exception v1
    const-string v1, "Printing is not available on this phone"
    invoke-virtual {v0, v1}, Lin/mvit/parksmart/mobile/MainActivity;->toast(Ljava/lang/String;)V
    return-void
.end method
