<?php
sleep(2);
header('Content-type: application/javascript');
?>
document.write('<?php echo $_GET['t']; ?>');